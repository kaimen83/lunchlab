import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CreateStockAuditRequest, StockAuditListResponse } from '@/types/stock-audit';

/**
 * 재고 실사 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/audits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
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

    // 쿼리 파라미터 처리
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');

    // 실사 목록 조회
    let query = supabase
      .from('stock_audits')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // 상태 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: audits, error: auditsError, count } = await query;

    if (auditsError) {
      console.error('실사 목록 조회 오류:', auditsError);
      return NextResponse.json(
        { error: '실사 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const response: StockAuditListResponse = {
      audits: audits || [],
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('실사 목록 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 새로운 재고 실사 생성 API
 * 
 * @route POST /api/companies/[id]/stock/audits
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
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
    const body: CreateStockAuditRequest = await request.json();
    const { name, description, audit_date, item_types = ['ingredient', 'container'], warehouse_id } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '실사명을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!audit_date) {
      return NextResponse.json(
        { error: '실사 날짜를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 창고 ID 결정 (요청에서 제공되지 않으면 기본 창고 사용)
    let finalWarehouseId = warehouse_id;
    if (!finalWarehouseId) {
      const { data: defaultWarehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .single();

      if (warehouseError || !defaultWarehouse) {
        return NextResponse.json(
          { error: '기본 창고를 찾을 수 없습니다. 창고를 먼저 설정해주세요.' },
          { status: 400 }
        );
      }
      
      finalWarehouseId = defaultWarehouse.id;
    }

    // 트랜잭션 시작: 실사 세션 생성 + 실사 항목 생성
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .insert({
        company_id: companyId,
        name: name.trim(),
        description: description?.trim(),
        audit_date: audit_date, // 사용자가 선택한 실사 날짜
        warehouse_id: finalWarehouseId, // 창고 ID 추가
        user_id: userId,
        status: 'in_progress'
      })
      .select()
      .single();

    if (auditError) {
      console.error('실사 세션 생성 오류:', auditError);
      return NextResponse.json(
        { 
          error: '실사 세션을 생성하는데 실패했습니다.',
          details: auditError.message 
        },
        { status: 500 }
      );
    }

    // 모든 등록된 항목들을 조회하여 실사 대상 결정
    let allItems = [];

    // 1. 식자재 항목 조회 (재고 정보와 함께)
    if (item_types.includes('ingredient')) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name, unit, code_name, stock_grade')
        .eq('company_id', companyId)
        .not('stock_grade', 'is', null); // 재고관리 등급이 있는 식자재만

      if (ingredientsError) {
        console.error('식자재 조회 오류:', ingredientsError);
        return NextResponse.json(
          { 
            error: '식자재를 조회하는데 실패했습니다.',
            details: ingredientsError.message 
          },
          { status: 500 }
        );
      }

      if (ingredients && ingredients.length > 0) {
        // 해당 식자재들의 재고 정보 조회 (선택된 창고만 대상)
        const ingredientIds = ingredients.map(ing => ing.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .eq('warehouse_id', finalWarehouseId) // 선택된 창고만 필터링
          .in('item_id', ingredientIds);

        if (stockError) {
          console.error('식자재 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '식자재 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 식자재 항목들을 실사 항목 형태로 변환 (선택된 창고의 재고량만 사용)
        for (const ingredient of ingredients) {
          const stockItem = stockItems?.find(stock => stock.item_id === ingredient.id);
          allItems.push({
            id: stockItem?.id || null,
            item_type: 'ingredient',
            item_id: ingredient.id,
            item_name: ingredient.name,
            item_code: ingredient.code_name, // 검색 성능 향상을 위해 코드명 추가
            stock_grade: ingredient.stock_grade, // 재고 등급 추가
            unit: ingredient.unit || 'EA',
            current_quantity: stockItem?.current_quantity || 0, // 해당 창고에 없으면 0
            has_stock_record: !!stockItem,
            warehouse_id: finalWarehouseId
          });
        }
      }
    }

    // 2. 용기 항목 조회 (재고 정보와 함께) - 최상위 레벨만
    if (item_types.includes('container')) {
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('id, name, price, code_name')
        .eq('company_id', companyId)
        .is('parent_container_id', null); // 상위 그룹이 없는 컨테이너만 조회

      if (containersError) {
        console.error('용기 조회 오류:', containersError);
        return NextResponse.json(
          { 
            error: '용기를 조회하는데 실패했습니다.',
            details: containersError.message 
          },
          { status: 500 }
        );
      }

      if (containers && containers.length > 0) {
        // 해당 용기들의 재고 정보 조회 (선택된 창고만 대상)
        const containerIds = containers.map(cont => cont.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .eq('warehouse_id', finalWarehouseId) // 선택된 창고만 필터링
          .in('item_id', containerIds);

        if (stockError) {
          console.error('용기 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '용기 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 하위 컨테이너들을 상위 그룹별로 그룹화하고 최대 수량으로 집계
        const containerMap = new Map();
        
        // 먼저 모든 하위 컨테이너들을 조회하여 상위 그룹별로 분류
        for (const topContainer of containers) {
          const { data: subContainers, error: subError } = await supabase
            .from('containers')
            .select('id, name, parent_container_id')
            .eq('company_id', companyId)
            .eq('parent_container_id', topContainer.id);

          if (subError) {
            console.error('하위 컨테이너 조회 오류:', subError);
            continue;
          }

          // 하위 컨테이너들이 있으면 각각의 재고를 확인
          if (subContainers && subContainers.length > 0) {
            const subContainerIds = subContainers.map(sub => sub.id);
            const { data: subStockItems, error: subStockError } = await supabase
              .from('stock_items')
              .select('id, item_id, current_quantity, warehouse_id')
              .eq('company_id', companyId)
              .eq('item_type', 'container')
              .eq('warehouse_id', finalWarehouseId) // 선택된 창고만 필터링
              .in('item_id', subContainerIds);

            if (subStockError) {
              console.error('하위 컨테이너 재고 조회 오류:', subStockError);
              continue;
            }

            // 하위 컨테이너들의 최대 재고량 찾기
            let maxQuantity = Number.NEGATIVE_INFINITY; // 음수 포함하여 진짜 최대값 찾기
            let maxStockItem = null;
            
            for (const subContainer of subContainers) {
              const subStockItem = subStockItems?.find(stock => stock.item_id === subContainer.id);
              const quantity = subStockItem?.current_quantity || 0;
              
              if (quantity > maxQuantity) {
                maxQuantity = quantity;
                maxStockItem = subStockItem;
              }
            }
            
            // 하위 아이템이 없거나 모든 재고가 0인 경우 처리
            if (maxQuantity === Number.NEGATIVE_INFINITY) {
              maxQuantity = 0;
            }

            // 상위 컨테이너 자체의 stock_item 확인
            const topContainerStockItem = stockItems?.find(stock => stock.item_id === topContainer.id);
            
            // 상위 그룹으로 항목 추가 (선택된 창고에서의 최대 수량 사용)
            allItems.push({
              id: topContainerStockItem?.id || null, // 상위 컨테이너의 stock_item id 사용
              item_type: 'container',
              item_id: topContainer.id, // 상위 그룹 ID 사용
              item_name: topContainer.name, // 상위 그룹명 사용
              item_code: topContainer.code_name, // 검색 성능 향상을 위해 코드명 추가
              stock_grade: null, // 용기는 등급이 없음
              unit: '개',
              current_quantity: maxQuantity, // 선택된 창고에서 하위 중 최대 수량
              has_stock_record: !!topContainerStockItem, // 상위 컨테이너의 stock_item 존재 여부
              warehouse_id: finalWarehouseId
            });
          } else {
            // 하위 컨테이너가 없으면 그 자체로 처리 (선택된 창고의 재고량만 사용)
            const stockItem = stockItems?.find(stock => stock.item_id === topContainer.id);
            allItems.push({
              id: stockItem?.id || null,
              item_type: 'container',
              item_id: topContainer.id,
              item_name: topContainer.name,
              item_code: topContainer.code_name, // 검색 성능 향상을 위해 코드명 추가
              stock_grade: null, // 용기는 등급이 없음
              unit: '개',
              current_quantity: stockItem?.current_quantity || 0, // 해당 창고에 없으면 0
              has_stock_record: !!stockItem,
              warehouse_id: finalWarehouseId
            });
          }
        }
      }
    }

    console.log(`실사 생성: 회사 ${companyId}에서 ${allItems.length}개 항목 조회됨`);
    console.log(`항목 타입별 분포:`, allItems.reduce((acc, item) => {
      acc[item.item_type] = (acc[item.item_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    console.log(`재고 레코드 있는 항목: ${allItems.filter(item => item.has_stock_record).length}개`);
    console.log(`재고 레코드 없는 항목: ${allItems.filter(item => !item.has_stock_record).length}개`);

    if (allItems.length === 0) {
      console.log('등록된 항목이 없어서 빈 실사 생성');
      return NextResponse.json({
        audit,
        items_count: 0
      }, { status: 201 });
    }

    // 선택된 창고에 재고 레코드가 없는 항목들에 대해서만 stock_items 레코드 생성
    const itemsWithoutStock = allItems.filter(item => !item.has_stock_record);
    if (itemsWithoutStock.length > 0) {
      console.log(`${itemsWithoutStock.length}개 항목에 대해 ${finalWarehouseId} 창고에 재고 레코드 생성 시도...`);
      
      // 각 항목별로 개별적으로 처리 (더 안전한 방법)
      for (const item of itemsWithoutStock) {
        try {
          // 먼저 이미 존재하는지 확인
          const { data: existing, error: checkError } = await supabase
            .from('stock_items')
            .select('id, current_quantity')
            .eq('company_id', companyId)
            .eq('warehouse_id', finalWarehouseId)
            .eq('item_type', item.item_type)
            .eq('item_id', item.item_id)
            .maybeSingle(); // single() 대신 maybeSingle() 사용

          if (checkError) {
            console.error(`재고 확인 오류 (${item.item_name}):`, checkError);
            continue;
          }

          if (existing) {
            // 이미 존재하면 해당 정보로 업데이트
            item.id = existing.id;
            item.has_stock_record = true;
            item.current_quantity = existing.current_quantity || 0;
            console.log(`이미 존재하는 재고: ${item.item_name} (ID: ${existing.id})`);
          } else {
            // 존재하지 않으면 새로 생성
            const { data: created, error: createError } = await supabase
              .from('stock_items')
              .insert({
                company_id: companyId,
                item_type: item.item_type,
                item_id: item.item_id,
                current_quantity: 0,
                unit: item.unit,
                warehouse_id: finalWarehouseId
              })
              .select('id')
              .single();

            if (createError) {
              console.error(`재고 생성 오류 (${item.item_name}):`, createError);
              // 중복 키 오류인 경우 무시하고 계속 진행
              if (createError.code !== '23505') {
                continue;
              }
            } else if (created) {
              item.id = created.id;
              item.has_stock_record = true;
              item.current_quantity = 0;
              console.log(`새 재고 생성: ${item.item_name} (ID: ${created.id})`);
            }
          }
        } catch (error) {
          console.error(`재고 처리 중 오류 (${item.item_name}):`, error);
          continue;
        }
      }
    }

    // 실사 항목 데이터 준비 (difference는 generated column이므로 제외)
    const auditItems = allItems.map(item => ({
      audit_id: audit.id,
      stock_item_id: item.id, // 이제 모든 항목이 stock_item_id를 가짐
      item_id: item.item_id, // 실제 아이템 ID 추가
      item_name: item.item_name,
      item_code: item.item_code, // 검색 성능 향상을 위해 코드명 저장
      item_type: item.item_type,
      unit: item.unit,
      book_quantity: item.current_quantity,
      actual_quantity: null, // 초기에는 null
      // difference: generated column이므로 INSERT 시 제외
      status: 'pending',
      stock_grade: item.stock_grade, // 재고 등급 추가
      notes: null // 초기에는 null
    }));

    // 실사 항목들 일괄 생성
    if (auditItems.length > 0) {
      console.log(`${auditItems.length}개 실사 항목 생성 시도`);
      
      const { error: itemsError } = await supabase
        .from('stock_audit_items')
        .insert(auditItems);

      if (itemsError) {
        console.error('실사 항목 생성 오류:', itemsError);
        // 실사 세션도 삭제
        await supabase
          .from('stock_audits')
          .delete()
          .eq('id', audit.id);

        return NextResponse.json(
          { 
            error: '실사 항목을 생성하는데 실패했습니다.',
            details: itemsError.message 
          },
          { status: 500 }
        );
      }
      
      console.log(`실사 항목 생성 완료: ${auditItems.length}개`);
    }

    return NextResponse.json({
      audit,
      items_count: auditItems.length
    }, { status: 201 });

  } catch (error) {
    console.error('실사 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 