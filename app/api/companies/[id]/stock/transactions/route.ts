import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 거래 내역 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/transactions
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 거래 내역 목록
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    // 로그인하지 않은 경우 권한 없음
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // URL 쿼리 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const stockItemId = searchParams.get('stockItemId');
    const stockItemIds = searchParams.getAll('stockItemIds'); // 여러 ID 지원
    const transactionType = searchParams.get('transactionType');
    const selectedDate = searchParams.get('selectedDate'); // startDate, endDate 대신 selectedDate 사용
    const warehouseId = searchParams.get('warehouseId'); // 창고 필터 추가
    const itemName = searchParams.get('itemName'); // 항목 이름 검색 추가
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    console.log('거래 내역 조회 API 호출:', { 
      companyId, 
      stockItemId, 
      stockItemIds, 
      transactionType, 
      selectedDate,
      itemName, // 로그에 추가
      page, 
      pageSize 
    });

    // 회사의 재고 항목 ID 목록 가져오기
    let stockItemsQuery = supabase
      .from('stock_items')
      .select(`
        id,
        item_type,
        item_id
      `)
      .eq('company_id', companyId);

    // 항목 이름으로 검색하는 경우 필터링 추가
    if (itemName && itemName.trim()) {
      // 식자재 이름으로 검색
      const { data: matchingIngredients } = await supabase
        .from('ingredients')
        .select('id')
        .eq('company_id', companyId)
        .or(`name.ilike.%${itemName.trim()}%,code_name.ilike.%${itemName.trim()}%`);
      
      // 용기 이름으로 검색  
      const { data: matchingContainers } = await supabase
        .from('containers')
        .select('id')
        .eq('company_id', companyId)
        .or(`name.ilike.%${itemName.trim()}%,code_name.ilike.%${itemName.trim()}%`);

      const ingredientIds = matchingIngredients?.map(item => item.id) || [];
      const containerIds = matchingContainers?.map(item => item.id) || [];

      // 검색된 식자재/용기 ID를 가진 stock_items만 필터링
      if (ingredientIds.length > 0 || containerIds.length > 0) {
        stockItemsQuery = stockItemsQuery.or(
          `and(item_type.eq.ingredient,item_id.in.(${ingredientIds.join(',')})),and(item_type.eq.container,item_id.in.(${containerIds.join(',')}))`
        );
      } else {
        // 검색 결과가 없으면 빈 배열 반환
        return NextResponse.json({
          transactions: [],
          pagination: {
            total: 0,
            page: 1,
            pageSize: pageSize,
            pageCount: 0,
          }
        });
      }
    }

    const { data: stockItems, error: stockItemsError } = await stockItemsQuery;

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const allStockItemIds = stockItems.map(item => item.id);

    // 거래 내역 조회 쿼리 시작 (stock_item의 warehouse 정보도 포함)
    let query = supabase
      .from('stock_transactions')
      .select(`
        *,
        stock_item:stock_item_id(
          id, 
          item_type, 
          item_id,
          warehouse:warehouse_id(
            id,
            name
          )
        ),
        source_warehouse:source_warehouse_id(
          id,
          name
        ),
        destination_warehouse:destination_warehouse_id(
          id,
          name
        )
      `, { count: 'exact' })
      .in('stock_item_id', allStockItemIds)
      .not('notes', 'like', '%[DISPLAY_HIDDEN]%'); // DB 레벨에서 숨겨진 거래 필터링

    // 필터 적용
    if (stockItemId) {
      // 단일 stockItemId 필터
      query = query.eq('stock_item_id', stockItemId);
    } else if (stockItemIds && stockItemIds.length > 0) {
      // 여러 stockItemIds 필터
      query = query.in('stock_item_id', stockItemIds);
    }

    if (transactionType && ['incoming', 'outgoing', 'disposal', 'adjustment', 'transfer', 'in', 'out', 'verification'].includes(transactionType)) {
      query = query.eq('transaction_type', transactionType);
    }

    // 창고 필터링 추가 (올바른 컬럼명 사용)
    if (warehouseId) {
      query = query.or(`source_warehouse_id.eq.${warehouseId},destination_warehouse_id.eq.${warehouseId}`);
    }

    // 특정 날짜의 거래내역만 조회 (해당 날짜 00:00:00 ~ 23:59:59)
    if (selectedDate) {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;
      query = query.gte('transaction_date', startOfDay).lte('transaction_date', endOfDay);
    }

    // 정렬 적용
    query = query.order('transaction_date', { ascending: false });

    // 페이지네이션 적용 (필터링 후 적용)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // 데이터 가져오기
    const { data: transactions, count, error } = await query;

    if (error) {
      console.error('거래 내역 조회 오류:', error);
      return NextResponse.json(
        { error: '거래 내역을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 항목 상세 정보 가져오기
    const transactionsWithDetails = await Promise.all(
      transactions.map(async (transaction) => {
        const stockItem = transaction.stock_item;
        let itemDetails = null;
        let itemUnit = '개'; // 기본 단위는 '개'로 설정

        if (stockItem && typeof stockItem === 'object' && 'item_type' in stockItem) {
          if (stockItem.item_type === 'ingredient') {
            const { data: ingredient } = await supabase
              .from('ingredients')
              .select('id, name, unit, code_name')
              .eq('id', stockItem.item_id)
              .single();
            
            itemDetails = ingredient;
            if (ingredient?.unit) {
              itemUnit = ingredient.unit; // 식자재의 경우 단위 정보 저장
            }
          } else if (stockItem.item_type === 'container') {
            const { data: container } = await supabase
              .from('containers')
              .select('id, name, code_name, parent_container_id')
              .eq('id', stockItem.item_id)
              .single();
            
            // 최상위 그룹이 있는 경우 그룹 정보를 조회, 없으면 자기 자신
            if (container?.parent_container_id) {
              // 상위 그룹 정보 조회
              const { data: parentContainer } = await supabase
                .from('containers')
                .select('id, name, code_name')
                .eq('id', container.parent_container_id)
                .is('parent_container_id', null) // 최상위 레벨만
                .single();
              
              itemDetails = parentContainer || container; // 상위 그룹이 있으면 그룹 정보, 없으면 원래 정보
            } else {
              itemDetails = container; // 이미 최상위 레벨인 경우
            }
            // 용기는 항상 '개' 단위 사용
          }
        }

        // 클라이언트 컴포넌트에서 필요한 구조로 변환
        return {
          id: transaction.id,
          transaction_type: transaction.transaction_type === 'incoming' ? 'in' : 
                            transaction.transaction_type === 'outgoing' ? 'out' : 
                            transaction.transaction_type,
          quantity: transaction.quantity,
          unit: itemUnit, // 저장된 단위 정보 사용
          created_at: transaction.transaction_date || transaction.created_at,
          notes: transaction.notes || '',
          status: 'completed', // 기본값 설정
          created_by: {
            id: transaction.user_id || '',
            name: transaction.user_name || '시스템'
          },
          stock_item: {
            id: stockItem?.id || '',
            item_type: stockItem?.item_type || '',
            details: {
              name: itemDetails?.name || '삭제된 항목',
              code_name: itemDetails?.code_name || ''
            }
          },
          // 창고 정보 추가 - stock_item의 warehouse 정보를 우선 사용
          warehouse: transaction.source_warehouse ? {
            id: transaction.source_warehouse.id,
            name: transaction.source_warehouse.name
          } : (stockItem?.warehouse ? {
            id: stockItem.warehouse.id,
            name: stockItem.warehouse.name
          } : undefined),
          destination_warehouse: transaction.destination_warehouse ? {
            id: transaction.destination_warehouse.id,
            name: transaction.destination_warehouse.name
          } : (transaction.transaction_type === 'incoming' && stockItem?.warehouse ? {
            id: stockItem.warehouse.id,
            name: stockItem.warehouse.name
          } : undefined)
        };
      })
    );

    // 날짜순으로 정렬 (DB에서 이미 정렬했지만 안전을 위해)
    const finalTransactions = transactionsWithDetails
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 응답 반환 (count는 이미 필터링된 총 개수)
    return NextResponse.json({
      transactions: finalTransactions,
      pagination: {
        total: count || 0, // DB에서 계산된 정확한 총 개수 사용
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('거래 내역 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 임시 ID 처리를 위한 함수 추가
/**
 * 창고간 이동 처리 함수
 * 원본 창고에서 재고 차감, 대상 창고에서 재고 증가
 * 주의: 마이너스 재고 허용됨
 */
async function handleWarehouseTransfer(
  supabase: any,
  adjustment: any,
  sourceWarehouseId: string,
  destinationWarehouseId: string,
  companyId: string,
  userId: string
) {
  const transferQuantity = Number(adjustment.quantity);
  
  // 1. 먼저 선택된 재고 항목의 기본 정보 조회 (item_type, item_id 등)
  const { data: baseStockItem, error: baseStockError } = await supabase
    .from('stock_items')
    .select('item_type, item_id, unit')
    .eq('id', adjustment.stockItemId)
    .eq('company_id', companyId)
    .single();

  if (baseStockError || !baseStockItem) {
    throw new Error(`재고 항목 정보를 찾을 수 없습니다: ${adjustment.stockItemId}`);
  }

  // 2. 원본 창고에서 같은 item_type/item_id를 가진 재고 조회 또는 생성
  let { data: sourceStockItem, error: sourceQueryError } = await supabase
    .from('stock_items')
    .select('id, current_quantity')
    .eq('warehouse_id', sourceWarehouseId)
    .eq('company_id', companyId)
    .eq('item_type', baseStockItem.item_type)
    .eq('item_id', baseStockItem.item_id)
    .single();

  if (sourceQueryError || !sourceStockItem) {
    // 원본 창고에 재고 항목이 없으면 생성 (0부터 시작)
    const { data: newSourceStockItem, error: createSourceError } = await supabase
      .from('stock_items')
      .insert({
        company_id: companyId,
        warehouse_id: sourceWarehouseId,
        item_type: baseStockItem.item_type,
        item_id: baseStockItem.item_id,
        current_quantity: 0, // 0부터 시작
        unit: baseStockItem.unit,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select('id, current_quantity')
      .single();

    if (createSourceError) {
      throw new Error(`원본 창고에 재고 항목 생성 실패: ${createSourceError.message}`);
    }
    
    sourceStockItem = newSourceStockItem;
  }

  // 2. 마이너스 재고 허용 - 재고 부족 검증 제거
  // 원본 창고에서는 마이너스 재고도 허용함

  // 3. 대상 창고에서 해당 항목의 재고 조회 (없으면 생성)
  let { data: destStockItem, error: destQueryError } = await supabase
    .from('stock_items')
    .select('id, current_quantity')
    .eq('warehouse_id', destinationWarehouseId)
    .eq('company_id', companyId)
    .eq('item_type', baseStockItem.item_type)
    .eq('item_id', baseStockItem.item_id)
    .single();

  if (destQueryError && destQueryError.code !== 'PGRST116') { // PGRST116은 'not found' 에러
    throw new Error(`대상 창고 재고 조회 중 오류가 발생했습니다: ${destQueryError.message}`);
  }

  // 4. 대상 창고에 재고 항목이 없으면 새로 생성
  if (!destStockItem) {
    const { data: newDestStockItem, error: createError } = await supabase
      .from('stock_items')
      .insert({
        company_id: companyId,
        warehouse_id: destinationWarehouseId,
        item_type: baseStockItem.item_type,
        item_id: baseStockItem.item_id,
        current_quantity: 0,
        unit: baseStockItem.unit,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .select('id, current_quantity')
      .single();

    if (createError) {
      throw new Error(`대상 창고에 재고 항목 생성 실패: ${createError.message}`);
    }
    
    destStockItem = newDestStockItem;
  }

  // 5. 트랜잭션으로 두 창고 재고 업데이트
  const sourceNewQuantity = Number(sourceStockItem.current_quantity) - transferQuantity;
  const destNewQuantity = Number(destStockItem.current_quantity) + transferQuantity;

  // 원본 창고 재고 차감
  const { error: sourceUpdateError } = await supabase
    .from('stock_items')
    .update({
      current_quantity: sourceNewQuantity,
      last_updated: new Date().toISOString()
    })
    .eq('id', sourceStockItem.id);

  if (sourceUpdateError) {
    throw new Error(`원본 창고 재고 업데이트 실패: ${sourceUpdateError.message}`);
  }

  // 대상 창고 재고 증가
  const { error: destUpdateError } = await supabase
    .from('stock_items')
    .update({
      current_quantity: destNewQuantity,
      last_updated: new Date().toISOString()
    })
    .eq('id', destStockItem.id);

  if (destUpdateError) {
    // 원본 창고 복구 시도
    await supabase
      .from('stock_items')
      .update({
        current_quantity: sourceStockItem.current_quantity,
        last_updated: new Date().toISOString()
      })
      .eq('id', sourceStockItem.id);
    
    throw new Error(`대상 창고 재고 업데이트 실패: ${destUpdateError.message}`);
  }

  return {
    sourceStockItemId: sourceStockItem.id,
    destStockItemId: destStockItem.id,
    transferQuantity,
    sourceOldQuantity: sourceStockItem.current_quantity,
    sourceNewQuantity,
    destOldQuantity: destStockItem.current_quantity,
    destNewQuantity
  };
}

async function processTemporaryIds(
  supabase: any, 
  stockItemIds: string[], 
  companyId: string, 
  userId: string,
  warehouseId?: string
): Promise<string[]> {
  const processedIds = [...stockItemIds]; // 기존 ID 배열 복사
  
  console.log('processTemporaryIds - 입력된 ID들:', stockItemIds);
  
  for (let i = 0; i < stockItemIds.length; i++) {
    const id = stockItemIds[i];
    console.log(`처리 중인 ID: ${id}`);
    
    // 임시 식자재 ID인지 확인 (temp_ingredient_ 또는 ingredient_로 시작하는지)
    if (id.startsWith('temp_ingredient_') || id.startsWith('ingredient_')) {
      // 임시 ID에서 실제 식자재 ID 추출
      const ingredientId = id.startsWith('temp_ingredient_') 
        ? id.replace('temp_ingredient_', '')
        : id.replace('ingredient_', '');
      
      // UUID 형식 검증
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(ingredientId)) {
        console.error('유효하지 않은 UUID 형식:', ingredientId);
        throw new Error(`유효하지 않은 식자재 ID 형식입니다: ${ingredientId}`);
      }
      
      // 이 식자재의 정보 조회
      const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .select('name, unit')
        .eq('id', ingredientId)
        .single();
        
      if (ingredientError) {
        console.error('식자재 정보 조회 오류:', ingredientError);
        throw new Error(`식자재 정보를 조회할 수 없습니다: ${ingredientError.message}`);
      }
      
      // 창고 ID 결정 (전달받은 ID가 있으면 우선 사용, 없으면 기본 창고 조회)
      let targetWarehouseId = warehouseId;
      
      if (!targetWarehouseId) {
        const { data: defaultWarehouse, error: warehouseError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .single();
        
        if (warehouseError) {
          console.error('기본 창고 조회 오류:', warehouseError);
          throw new Error(`기본 창고를 찾을 수 없습니다: ${warehouseError.message}`);
        }
        
        targetWarehouseId = defaultWarehouse.id;
      }
      
      // 해당 식자재에 대한 재고 항목이 특정 창고에 이미 존재하는지 확인
      const { data: existingStockItem, error: checkError } = await supabase
        .from('stock_items')
        .select('id')
        .eq('company_id', companyId)
        .eq('warehouse_id', targetWarehouseId)
        .eq('item_type', 'ingredient')
        .eq('item_id', ingredientId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116은 "not found" 에러
        console.error('재고 항목 조회 오류:', checkError);
        throw new Error(`재고 항목을 조회할 수 없습니다: ${checkError.message}`);
      }
      
      if (existingStockItem) {
        // 이미 존재하는 재고 항목이 있으면 해당 ID 사용
        processedIds[i] = existingStockItem.id;
      } else {
        // 존재하지 않으면 새로 생성
        const { data: newStockItem, error: createError } = await supabase
          .from('stock_items')
          .insert({
            company_id: companyId,
            item_type: 'ingredient',
            item_id: ingredientId,
            current_quantity: 0, // 초기 수량은 0
            unit: ingredient.unit || '개',
            warehouse_id: targetWarehouseId
          })
          .select()
          .single();
          
        if (createError) {
          console.error('재고 항목 생성 오류:', createError);
          throw new Error(`재고 항목을 생성할 수 없습니다: ${createError.message}`);
        }
        
        // 생성된 실제 재고 항목 ID로 대체
        processedIds[i] = newStockItem.id;
      }
    }
    // temp_container_ 또는 container_로 시작하는 경우 처리
    else if (id.startsWith('temp_container_') || id.startsWith('container_')) {
      // 임시 ID에서 실제 용기 ID 추출
      const containerId = id.startsWith('temp_container_') 
        ? id.replace('temp_container_', '')
        : id.replace('container_', '');
      
      // UUID 형식 검증
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(containerId)) {
        console.error('유효하지 않은 UUID 형식:', containerId);
        throw new Error(`유효하지 않은 용기 ID 형식입니다: ${containerId}`);
      }
      
      // 이 용기의 정보 조회
      const { data: container, error: containerError } = await supabase
        .from('containers')
        .select('name')
        .eq('id', containerId)
        .single();
        
      if (containerError) {
        console.error('용기 정보 조회 오류:', containerError);
        throw new Error(`용기 정보를 조회할 수 없습니다: ${containerError.message}`);
      }
      
      // 창고 ID 결정 (전달받은 ID가 있으면 우선 사용, 없으면 기본 창고 조회)
      let targetWarehouseId = warehouseId;
      
      if (!targetWarehouseId) {
        const { data: defaultWarehouse, error: warehouseError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', companyId)
          .eq('is_default', true)
          .single();
        
        if (warehouseError) {
          console.error('기본 창고 조회 오류:', warehouseError);
          throw new Error(`기본 창고를 찾을 수 없습니다: ${warehouseError.message}`);
        }
        
        targetWarehouseId = defaultWarehouse.id;
      }
      
      // 해당 용기에 대한 재고 항목이 특정 창고에 이미 존재하는지 확인
      const { data: existingStockItem, error: checkError } = await supabase
        .from('stock_items')
        .select('id')
        .eq('company_id', companyId)
        .eq('warehouse_id', targetWarehouseId)
        .eq('item_type', 'container')
        .eq('item_id', containerId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116은 "not found" 에러
        console.error('재고 항목 조회 오류:', checkError);
        throw new Error(`재고 항목을 조회할 수 없습니다: ${checkError.message}`);
      }
      
      if (existingStockItem) {
        // 이미 존재하는 재고 항목이 있으면 해당 ID 사용
        processedIds[i] = existingStockItem.id;
      } else {
        // 존재하지 않으면 새로 생성
        const { data: newStockItem, error: createError } = await supabase
          .from('stock_items')
          .insert({
            company_id: companyId,
            item_type: 'container',
            item_id: containerId,
            current_quantity: 0, // 초기 수량은 0
            unit: '개', // 용기의 기본 단위는 '개'
            warehouse_id: targetWarehouseId
          })
          .select()
          .single();
          
        if (createError) {
          console.error('재고 항목 생성 오류:', createError);
          throw new Error(`재고 항목을 생성할 수 없습니다: ${createError.message}`);
        }
        
        // 생성된 실제 재고 항목 ID로 대체
        processedIds[i] = newStockItem.id;
      }
    }
  }
  
  return processedIds;
}

/**
 * 거래 요청 생성 API
 * 
 * @route POST /api/companies/[id]/stock/transactions
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 생성된 거래 요청 정보
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    // 로그인하지 않은 경우 권한 없음
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const requestData = await request.json();
    let { 
      stockItemIds, 
      quantities, 
      transactionItems,
      stockAdjustments,
      requestType, 
      notes = '', 
      referenceId = null, 
      referenceType = null,
      isGroupedTransaction = false,
      warehouseId = null,
      warehouseIds = null,  // 다중 창고 지원을 위한 창고 ID 배열
      useMultipleWarehouses = false, // 다중 창고 모드 플래그
      sourceWarehouseId = null,
      destinationWarehouseId = null
    } = requestData;

    // 새로운 그룹화된 거래 형식 지원
    if (isGroupedTransaction && transactionItems && stockAdjustments) {
      // 새로운 형식: 개별 거래 기록과 실제 재고 차감 분리
      if (!Array.isArray(transactionItems) || !Array.isArray(stockAdjustments)) {
        return NextResponse.json(
          { error: '그룹화된 거래 데이터 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
    } else {
      // 기존 형식: 호환성 유지
      if (!stockItemIds || !quantities || !requestType || !Array.isArray(stockItemIds) || !Array.isArray(quantities)) {
        return NextResponse.json(
          { error: '필수 필드가 누락되었거나 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }

      if (stockItemIds.length !== quantities.length) {
        return NextResponse.json(
          { error: '항목 ID와 수량의 개수가 일치하지 않습니다.' },
          { status: 400 }
        );
      }

      // 기존 형식을 새로운 형식으로 변환
      transactionItems = stockItemIds.map((id: string, index: number) => ({
        stockItemId: id,
        quantity: quantities[index],
        itemName: `항목 ${index + 1}`
      }));
      stockAdjustments = stockItemIds.map((id: string, index: number) => ({
        stockItemId: id,
        quantity: quantities[index]
      }));
    }

    if (!['incoming', 'outgoing', 'disposal', 'transfer'].includes(requestType)) {
      return NextResponse.json(
        { error: '유효하지 않은 요청 유형입니다.' },
        { status: 400 }
      );
    }

    // 창고간 이동(transfer) 타입 특별 검증
    if (requestType === 'transfer') {
      if (!sourceWarehouseId || !destinationWarehouseId) {
        return NextResponse.json(
          { error: '창고간 이동에는 원본 창고와 대상 창고가 모두 필요합니다.' },
          { status: 400 }
        );
      }

      if (sourceWarehouseId === destinationWarehouseId) {
        return NextResponse.json(
          { error: '원본 창고와 대상 창고가 같을 수 없습니다.' },
          { status: 400 }
        );
      }

      const { data: warehouses, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id, company_id, name')
        .in('id', [sourceWarehouseId, destinationWarehouseId])
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (warehouseError) {
        return NextResponse.json(
          { error: '창고 정보를 조회하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      if (!warehouses || warehouses.length !== 2) {
        return NextResponse.json(
          { error: '유효하지 않은 창고이거나 해당 회사에 속하지 않는 창고입니다.' },
          { status: 400 }
        );
      }
    }

    // 다중 창고 설정 검증
    if (useMultipleWarehouses) {
      if (!warehouseIds || !Array.isArray(warehouseIds)) {
        return NextResponse.json(
          { error: '다중 창고 모드에서는 warehouseIds 배열이 필요합니다.' },
          { status: 400 }
        );
      }
      
      if (warehouseIds.length !== transactionItems.length) {
        return NextResponse.json(
          { error: '거래 항목 수와 창고 ID 수가 일치하지 않습니다.' },
          { status: 400 }
        );
      }

      // 창고 유효성 검증
      const { data: warehouses, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id, company_id')
        .in('id', warehouseIds.filter(id => id)); // null/undefined 제외

      if (warehouseError) {
        return NextResponse.json(
          { error: '창고 정보를 조회하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      const invalidWarehouses = warehouses.filter(w => w.company_id !== companyId);
      if (invalidWarehouses.length > 0) {
        return NextResponse.json(
          { error: '일부 창고가 이 회사에 속하지 않습니다.' },
          { status: 403 }
        );
      }
    } else if (warehouseId) {
      // 단일 창고 모드에서 창고 유효성 검증
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id, company_id')
        .eq('id', warehouseId)
        .single();

      if (warehouseError || !warehouse || warehouse.company_id !== companyId) {
        return NextResponse.json(
          { error: '유효하지 않은 창고입니다.' },
          { status: 400 }
        );
      }
    }

    // 임시 ID 처리 (거래 기록용과 재고 차감용 모두)
    try {
      const transactionStockItemIds = transactionItems.map((item: any) => item.stockItemId);
      const adjustmentStockItemIds = stockAdjustments.map((item: any) => item.stockItemId);
      
      const processedTransactionIds = await processTemporaryIds(supabase, transactionStockItemIds, companyId, userId, warehouseId);
      const processedAdjustmentIds = await processTemporaryIds(supabase, adjustmentStockItemIds, companyId, userId, warehouseId);
      
      // 처리된 ID로 업데이트
      transactionItems = transactionItems.map((item: any, index: number) => ({
        ...item,
        stockItemId: processedTransactionIds[index]
      }));
      stockAdjustments = stockAdjustments.map((item: any, index: number) => ({
        ...item,
        stockItemId: processedAdjustmentIds[index]
      }));
    } catch (error: any) {
      return NextResponse.json(
        { error: `임시 재고 항목 처리 중 오류가 발생했습니다: ${error.message}` },
        { status: 500 }
      );
    }

    // 모든 항목이 이 회사의 소유인지 확인
    const allStockItemIds = [...new Set([
      ...transactionItems.map((item: any) => item.stockItemId),
      ...stockAdjustments.map((item: any) => item.stockItemId)
    ])];

    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('id, company_id')
      .in('id', allStockItemIds);

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const invalidItems = stockItems.filter(item => item.company_id !== companyId);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: '일부 항목이 이 회사에 속하지 않습니다.' },
        { status: 403 }
      );
    }

    // 관리자/소유자는 직접 처리, 일반 사용자는 승인 요청 생성
    const isAdminOrOwner = membership.role === 'admin' || membership.role === 'owner';
    
    // 트랜잭션 시작
    if (isAdminOrOwner && requestData.directProcess === true) {
      // 관리자/소유자가 직접 처리하는 경우
      
      // 동일한 재고 아이템의 중복 거래 감지 및 처리
      const itemGroups = new Map();
      
      transactionItems.forEach((item: any, index: number) => {
        const stockItemId = item.stockItemId;
        const quantity = Math.abs(item.quantity);
        
        if (itemGroups.has(stockItemId)) {
          const group = itemGroups.get(stockItemId);
          group.items.push({ item, index });
          if (quantity > group.maxQuantity) {
            group.maxQuantity = quantity;
            group.maxIndex = index;
          }
        } else {
          itemGroups.set(stockItemId, {
            maxQuantity: quantity,
            maxIndex: index,
            items: [{ item, index }]
          });
        }
      });

      // 1. 모든 개별 거래 내역 생성 (transactionItems 기준)
      const transactionPromises = transactionItems.map(async (item: any, index: number) => {
        // 실제 재고 차감에 사용되는 거래인지 확인
        const isActualStockChange = stockAdjustments.find((adj: any) => adj.stockItemId === item.stockItemId);
        // 그룹 내 최대값인지 확인 (표시 여부 결정)
        const isMaxInGroup = item.isMaxInGroup !== false; // 기본값은 true (호환성)
        
        // 동일 재고 아이템 그룹에서 최대 수량인지 확인
        const itemGroup = itemGroups.get(item.stockItemId);
        const isMaxQuantityInGroup = itemGroup && index === itemGroup.maxIndex;
        
        // 해당 거래의 창고 ID 결정
        const itemWarehouseId = useMultipleWarehouses 
          ? warehouseIds[index] 
          : warehouseId;

        // 거래 타입에 따라 창고 ID를 적절한 필드에 설정
        const warehouseFields: any = {};
        if (requestType === 'transfer') {
          // 창고간 이동: 원본과 대상 창고 모두 설정
          warehouseFields.source_warehouse_id = sourceWarehouseId;
          warehouseFields.destination_warehouse_id = destinationWarehouseId;
        } else if (itemWarehouseId) {
          if (requestType === 'incoming') {
            // 입고: destination_warehouse_id에 설정
            warehouseFields.destination_warehouse_id = itemWarehouseId;
          } else if (requestType === 'outgoing' || requestType === 'disposal') {
            // 출고/폐기: source_warehouse_id에 설정
            warehouseFields.source_warehouse_id = itemWarehouseId;
          }
        }

        const { data: transaction, error: transactionError } = await supabase
          .from('stock_transactions')
          .insert({
            stock_item_id: item.stockItemId,
            transaction_type: requestType,
            quantity: item.quantity,
            transaction_date: new Date().toISOString(),
            user_id: userId,
            reference_id: referenceId,
            reference_type: referenceType,
            ...warehouseFields, // 창고 필드 추가
            notes: isGroupedTransaction ? 
              (isMaxInGroup && isMaxQuantityInGroup ? 
                `${notes} - ${item.itemName} [ACTUAL_STOCK_CHANGE]` : 
                `${notes} - ${item.itemName} [DISPLAY_HIDDEN]`) : 
              notes
          })
          .select()
          .single();

        if (transactionError) {
          throw new Error(`거래 내역 생성 오류 (${item.itemName}): ${transactionError.message}`);
        }

        return transaction;
      });

      // 2. 실제 재고 수량 업데이트 (stockAdjustments 기준)
      const stockUpdatePromises = stockAdjustments.map(async (adjustment: any) => {
        if (requestType === 'transfer') {
          // 창고간 이동의 특별한 처리
          return await handleWarehouseTransfer(supabase, adjustment, sourceWarehouseId, destinationWarehouseId, companyId, userId);
        } else {
          // 기존 로직 (입고/출고/폐기)
          // 현재 재고 수량 조회
          const { data: stockItem } = await supabase
            .from('stock_items')
            .select('current_quantity')
            .eq('id', adjustment.stockItemId)
            .single();
          
          if (!stockItem) {
            throw new Error(`재고 항목을 찾을 수 없습니다: ${adjustment.stockItemId}`);
          }
          
          let newQuantity;
          if (requestType === 'incoming') {
            newQuantity = Number(stockItem.current_quantity) + Number(adjustment.quantity);
          } else if (requestType === 'outgoing' || requestType === 'disposal') {
            newQuantity = Number(stockItem.current_quantity) - Number(adjustment.quantity);
          }

          // 재고 수량 업데이트
          const { error: updateError } = await supabase
            .from('stock_items')
            .update({ 
              current_quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', adjustment.stockItemId);

          if (updateError) {
            throw new Error(`재고 수량 업데이트 오류: ${updateError.message}`);
          }

          return { stockItemId: adjustment.stockItemId, oldQuantity: stockItem.current_quantity, newQuantity };
        }
      });

      try {
        // 모든 작업을 병렬로 실행
        const [transactions, stockUpdates] = await Promise.all([
          Promise.all(transactionPromises),
          Promise.all(stockUpdatePromises)
        ]);

        const message = isGroupedTransaction ? 
          `${transactions.length}개 거래 기록, ${stockUpdates.length}개 재고 항목 업데이트 (그룹별 최적화 적용)` :
          '거래가 성공적으로 처리되었습니다.';

        return NextResponse.json({
          success: true,
          message,
          transactions,
          stockUpdates: isGroupedTransaction ? stockUpdates : undefined
        });
      } catch (err: any) {
        console.error('거래 처리 오류:', err);
        return NextResponse.json(
          { error: `거래 처리 중 오류가 발생했습니다: ${err.message}` },
          { status: 500 }
        );
      }
    } else {
      // 일반 사용자 또는 승인 요청을 생성하는 경우
      // 승인 요청 생성
      const { data: approvalRequest, error: approvalRequestError } = await supabase
        .from('stock_approval_requests')
        .insert({
          company_id: companyId,
          request_type: requestType,
          status: 'pending',
          requested_by: userId,
          notes
        })
        .select()
        .single();

      if (approvalRequestError) {
        console.error('승인 요청 생성 오류:', approvalRequestError);
        return NextResponse.json(
          { error: '승인 요청을 생성하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 승인 요청 항목 생성 (개별 거래 기록 기준)
      const approvalItems = transactionItems.map((item: any) => ({
        approval_request_id: approvalRequest.id,
        stock_item_id: item.stockItemId,
        quantity: item.quantity,
        notes: isGroupedTransaction ? `${notes} - ${item.itemName}` : notes
      }));

      const { error: approvalItemsError } = await supabase
        .from('stock_approval_items')
        .insert(approvalItems);

      if (approvalItemsError) {
        console.error('승인 요청 항목 생성 오류:', approvalItemsError);
        return NextResponse.json(
          { error: '승인 요청 항목을 생성하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 응답 반환
      return NextResponse.json({
        success: true,
        message: '승인 요청이 성공적으로 생성되었습니다.',
        approvalRequest
      });
    }
  } catch (error: any) {
    console.error('거래 요청 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 