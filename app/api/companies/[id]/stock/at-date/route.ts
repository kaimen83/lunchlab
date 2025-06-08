import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { StockAtDateResponse, StockItemAtDate } from '@/types/stock';

/**
 * 특정 날짜의 재고량 조회 API
 * 
 * @route GET /api/companies/[id]/stock/at-date
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @query targetDate - 조회할 날짜 (YYYY-MM-DD)
 * @query stockItemId - 특정 재고 항목 ID (선택사항)
 * @returns 특정 날짜의 재고량 정보
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StockAtDateResponse | { error: string }>> {
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
    const targetDate = searchParams.get('targetDate');
    const stockItemId = searchParams.get('stockItemId');

    if (!targetDate) {
      return NextResponse.json(
        { error: 'targetDate 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return NextResponse.json(
        { error: 'targetDate는 YYYY-MM-DD 형식이어야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`Fetching stock at date: ${targetDate} for company: ${companyId}`);

    // 특정 날짜의 재고량 계산
    const stockAtDate = await calculateStockAtDate(
      supabase,
      companyId,
      targetDate,
      stockItemId
    );

    return NextResponse.json(stockAtDate);

  } catch (error) {
    console.error('Stock at date API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * 특정 날짜의 재고량을 계산하는 함수
 * 하이브리드 방식: 최근 7일은 실시간 계산, 그 이전은 스냅샷 기반
 */
async function calculateStockAtDate(
  supabase: any,
  companyId: string,
  targetDate: string,
  stockItemId?: string | null
): Promise<StockAtDateResponse> {
  const target = new Date(targetDate);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`Days difference: ${daysDiff}`);

  if (daysDiff <= 7) {
    // 최근 7일: 실시간 역산
    return await calculateRecentStock(supabase, companyId, targetDate, stockItemId);
  } else {
    // 7일 이전: 스냅샷 기반 조회
    return await getStockFromSnapshot(supabase, companyId, targetDate, stockItemId);
  }
}

/**
 * 최근 데이터 실시간 계산 (7일 이내)
 */
async function calculateRecentStock(
  supabase: any,
  companyId: string,
  targetDate: string,
  stockItemId?: string | null
): Promise<StockAtDateResponse> {
  console.log('Using realtime calculation method');

  // 1단계: 재고 항목 조회
  let stockQuery = supabase
    .from('stock_items')
    .select('*')
    .eq('company_id', companyId);

  if (stockItemId) {
    stockQuery = stockQuery.eq('id', stockItemId);
  }

  const { data: stockItems, error: stockError } = await stockQuery;

  if (stockError) {
    throw new Error(`재고 항목 조회 오류: ${stockError.message}`);
  }

  if (!stockItems || stockItems.length === 0) {
    return {
      items: [],
      targetDate,
      calculationMethod: 'realtime'
    };
  }

  // 2단계: 배치로 식자재와 용기 정보 조회
  const ingredientIds = stockItems
    .filter((item: any) => item.item_type === 'ingredient')
    .map((item: any) => item.item_id);
  
  const containerIds = stockItems
    .filter((item: any) => item.item_type === 'container')
    .map((item: any) => item.item_id);

  // 병렬로 식자재와 용기 정보 조회
  const [ingredientsResult, containersResult] = await Promise.all([
    ingredientIds.length > 0 
      ? supabase.from('ingredients').select('id, name, code_name, unit').in('id', ingredientIds)
      : { data: [], error: null },
    containerIds.length > 0 
      ? supabase.from('containers').select('id, name, code_name, category').in('id', containerIds)
      : { data: [], error: null }
  ]);

  if (ingredientsResult.error || containersResult.error) {
    console.log('Batch detail query failed, falling back to individual queries');
    return await calculateRecentStockFallback(supabase, companyId, targetDate, stockItemId);
  }

  // 조회 결과를 Map으로 변환하여 빠른 검색
  const ingredientsMap = new Map(
    (ingredientsResult.data || []).map((item: any) => [item.id, item])
  );
  const containersMap = new Map(
    (containersResult.data || []).map((item: any) => [item.id, item])
  );

  const stockItemIds = stockItems.map((item: any) => item.id);

  // targetDate 다음날 00:00:00 이후의 모든 거래 조회 (역산을 위해)
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const { data: transactions, error: transactionError } = await supabase
    .from('stock_transactions')
    .select('*')
    .in('stock_item_id', stockItemIds)
    .gte('transaction_date', `${nextDayStr}T00:00:00`)
    .order('transaction_date', { ascending: true });

  if (transactionError) {
    throw new Error(`거래 내역 조회 오류: ${transactionError.message}`);
  }

    // 각 재고 항목에 대해 역산 계산
  const items: StockItemAtDate[] = [];

  for (const stockItem of stockItems) {
    // 해당 항목의 거래만 필터링
    const itemTransactions = transactions?.filter((t: any) => t.stock_item_id === stockItem.id) || [];

    // 현재 재고에서 targetDate 이후 거래를 역산
    let quantityAtDate = Number(stockItem.current_quantity);

    for (const transaction of itemTransactions) {
      if (transaction.transaction_type === 'incoming') {
        quantityAtDate -= Number(transaction.quantity);
      } else if (transaction.transaction_type === 'outgoing' || transaction.transaction_type === 'disposal') {
        quantityAtDate += Number(transaction.quantity);
      } else if (transaction.transaction_type === 'adjustment') {
        quantityAtDate -= Number(transaction.quantity);
      }
    }

    // Map에서 상세 정보 조회
    const itemDetails: any = stockItem.item_type === 'ingredient' 
      ? ingredientsMap.get(stockItem.item_id)
      : containersMap.get(stockItem.item_id);

    const itemName = itemDetails?.name || 'Unknown Item';

    items.push({
      stock_item_id: stockItem.id,
      item_type: stockItem.item_type,
      item_name: itemName,
      quantity: Math.max(0, quantityAtDate), // 음수 방지
      unit: stockItem.unit,
      details: {
        id: itemDetails?.id || stockItem.item_id,
        name: itemName,
        code_name: itemDetails?.code_name || undefined,
        category: stockItem.item_type === 'container' ? itemDetails?.category || undefined : undefined,
        unit: itemDetails?.unit || stockItem.unit
      }
    });
  }

  return {
    items,
    targetDate,
    calculationMethod: 'realtime'
  };
}

/**
 * 배치 쿼리 실패 시 폴백 함수 (기존 방식)
 */
async function calculateRecentStockFallback(
  supabase: any,
  companyId: string,
  targetDate: string,
  stockItemId?: string | null
): Promise<StockAtDateResponse> {
  console.log('Using fallback method with individual queries');

  // 회사의 모든 재고 항목 조회 (또는 특정 항목)
  let stockQuery = supabase
    .from('stock_items')
    .select('*')
    .eq('company_id', companyId);

  if (stockItemId) {
    stockQuery = stockQuery.eq('id', stockItemId);
  }

  const { data: stockItems, error: stockError } = await stockQuery;

  if (stockError) {
    throw new Error(`재고 항목 조회 오류: ${stockError.message}`);
  }

  if (!stockItems || stockItems.length === 0) {
    return {
      items: [],
      targetDate,
      calculationMethod: 'realtime'
    };
  }

  const stockItemIds = stockItems.map((item: any) => item.id);

  // targetDate 다음날 00:00:00 이후의 모든 거래 조회 (역산을 위해)
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const { data: transactions, error: transactionError } = await supabase
    .from('stock_transactions')
    .select('*')
    .in('stock_item_id', stockItemIds)
    .gte('transaction_date', `${nextDayStr}T00:00:00`)
    .order('transaction_date', { ascending: true });

  if (transactionError) {
    throw new Error(`거래 내역 조회 오류: ${transactionError.message}`);
  }

  // 각 재고 항목에 대해 역산 계산
  const items: StockItemAtDate[] = [];

  for (const stockItem of stockItems) {
    // 해당 항목의 거래만 필터링
    const itemTransactions = transactions?.filter((t: any) => t.stock_item_id === stockItem.id) || [];

    // 현재 재고에서 targetDate 이후 거래를 역산
    let quantityAtDate = Number(stockItem.current_quantity);

    for (const transaction of itemTransactions) {
      if (transaction.transaction_type === 'incoming') {
        quantityAtDate -= Number(transaction.quantity);
      } else if (transaction.transaction_type === 'outgoing' || transaction.transaction_type === 'disposal') {
        quantityAtDate += Number(transaction.quantity);
      } else if (transaction.transaction_type === 'adjustment') {
        quantityAtDate -= Number(transaction.quantity);
      }
    }

    // 항목 상세 정보 조회
    const itemDetails = await getItemDetails(supabase, stockItem.item_type, stockItem.item_id);

    items.push({
      stock_item_id: stockItem.id,
      item_type: stockItem.item_type,
      item_name: itemDetails.name,
      quantity: Math.max(0, quantityAtDate), // 음수 방지
      unit: stockItem.unit,
      details: itemDetails
    });
  }

  return {
    items,
    targetDate,
    calculationMethod: 'realtime'
  };
}

/**
 * 스냅샷 기반 조회 (7일 이전)
 */
async function getStockFromSnapshot(
  supabase: any,
  companyId: string,
  targetDate: string,
  stockItemId?: string | null
): Promise<StockAtDateResponse> {
  console.log('Using snapshot-based calculation method');

  // 해당 날짜 또는 가장 가까운 이전 날짜의 스냅샷 조회
  let snapshotQuery = supabase
    .from('daily_stock_snapshots')
    .select('*')
    .eq('company_id', companyId)
    .lte('snapshot_date', targetDate)
    .order('snapshot_date', { ascending: false });

  if (stockItemId) {
    snapshotQuery = snapshotQuery.eq('stock_item_id', stockItemId);
  }

  const { data: snapshots, error: snapshotError } = await snapshotQuery.limit(1000);

  if (snapshotError) {
    throw new Error(`스냅샷 조회 오류: ${snapshotError.message}`);
  }

  if (!snapshots || snapshots.length === 0) {
    // 스냅샷이 없으면 실시간 계산으로 폴백
    console.log('No snapshots found, falling back to realtime calculation');
    return await calculateRecentStock(supabase, companyId, targetDate, stockItemId);
  }

  // 가장 최근 스냅샷 날짜 찾기
  const latestSnapshotDate = snapshots[0].snapshot_date;
  console.log(`Using snapshot from: ${latestSnapshotDate}`);

  // 해당 날짜의 모든 스냅샷 가져오기
  const snapshotsAtDate = snapshots.filter((s: any) => s.snapshot_date === latestSnapshotDate);

  // 스냅샷 날짜와 타겟 날짜가 같으면 스냅샷 데이터 그대로 반환
  if (latestSnapshotDate === targetDate) {
    const items: StockItemAtDate[] = [];

    // 배치로 모든 stock_item 정보와 상세 정보를 한 번에 조회
    const stockItemIds = snapshotsAtDate.map((s: any) => s.stock_item_id);
    
    const { data: stockItemsWithDetails, error: stockItemError } = await supabase
      .from('stock_items')
      .select(`
        id,
        item_id,
        item_type,
        unit,
        ingredients:item_id!inner (
          id,
          name,
          code_name,
          category,
          unit
        ),
        containers:item_id!inner (
          id,
          name,
          code_name,
          category
        )
      `)
      .in('id', stockItemIds);

    if (stockItemError) {
      console.log('Batch query failed in snapshot, falling back to individual queries');
      // 폴백: 개별 조회
      for (const snapshot of snapshotsAtDate) {
        const { data: stockItem } = await supabase
          .from('stock_items')
          .select('item_id')
          .eq('id', snapshot.stock_item_id)
          .single();
        
        const itemDetails = await getItemDetails(supabase, snapshot.item_type, stockItem?.item_id || snapshot.stock_item_id);
        
        items.push({
          stock_item_id: snapshot.stock_item_id,
          item_type: snapshot.item_type,
          item_name: snapshot.item_name,
          quantity: Number(snapshot.quantity),
          unit: snapshot.unit,
          details: itemDetails
        });
      }
    } else {
      // 배치 쿼리 성공: 스냅샷과 상세 정보를 매칭
      for (const snapshot of snapshotsAtDate) {
        const stockItemDetail = stockItemsWithDetails?.find((si: any) => si.id === snapshot.stock_item_id);
        
        if (stockItemDetail) {
          const itemDetails = stockItemDetail.item_type === 'ingredient' 
            ? stockItemDetail.ingredients?.[0] 
            : stockItemDetail.containers?.[0];

          const itemName = itemDetails?.name || snapshot.item_name || 'Unknown Item';

          items.push({
            stock_item_id: snapshot.stock_item_id,
            item_type: snapshot.item_type,
            item_name: itemName,
            quantity: Number(snapshot.quantity),
            unit: snapshot.unit,
            details: {
              id: itemDetails?.id || stockItemDetail.item_id,
              name: itemName,
                      code_name: itemDetails?.code_name || undefined,
        category: itemDetails?.category || undefined,
              unit: itemDetails?.unit || snapshot.unit
            }
          });
        } else {
          // 매칭되지 않는 경우 스냅샷 데이터 사용
          items.push({
            stock_item_id: snapshot.stock_item_id,
            item_type: snapshot.item_type,
            item_name: snapshot.item_name,
            quantity: Number(snapshot.quantity),
            unit: snapshot.unit,
                         details: {
               id: snapshot.stock_item_id,
               name: snapshot.item_name,
               code_name: undefined,
               category: undefined,
               unit: snapshot.unit
             }
          });
        }
      }
    }

    return {
      items,
      targetDate,
      calculationMethod: 'snapshot',
      snapshotDate: latestSnapshotDate
    };
  }

  // 스냅샷 날짜 이후 타겟 날짜까지의 거래를 계산해서 보정
  const stockItemIds = snapshotsAtDate.map((s: any) => s.stock_item_id);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const { data: transactions, error: transactionError } = await supabase
    .from('stock_transactions')
    .select('*')
    .in('stock_item_id', stockItemIds)
    .gt('transaction_date', `${latestSnapshotDate}T23:59:59`)
    .lt('transaction_date', `${nextDayStr}T00:00:00`)
    .order('transaction_date', { ascending: true });

  if (transactionError) {
    throw new Error(`거래 내역 조회 오류: ${transactionError.message}`);
  }

  const items: StockItemAtDate[] = [];

  for (const snapshot of snapshotsAtDate) {
    // 해당 항목의 거래만 필터링
    const itemTransactions = transactions?.filter((t: any) => t.stock_item_id === snapshot.stock_item_id) || [];

    // 스냅샷 수량에서 거래 적용
    let quantityAtDate = Number(snapshot.quantity);

    for (const transaction of itemTransactions) {
      if (transaction.transaction_type === 'incoming') {
        quantityAtDate += Number(transaction.quantity);
      } else if (transaction.transaction_type === 'outgoing' || transaction.transaction_type === 'disposal') {
        quantityAtDate -= Number(transaction.quantity);
      } else if (transaction.transaction_type === 'adjustment') {
        quantityAtDate += Number(transaction.quantity);
      }
    }

    // stock_item_id가 아닌 실제 item_id를 사용해야 함
    const { data: stockItem } = await supabase
      .from('stock_items')
      .select('item_id')
      .eq('id', snapshot.stock_item_id)
      .single();
    
    const itemDetails = await getItemDetails(supabase, snapshot.item_type, stockItem?.item_id || snapshot.stock_item_id);

    items.push({
      stock_item_id: snapshot.stock_item_id,
      item_type: snapshot.item_type,
      item_name: snapshot.item_name,
      quantity: Math.max(0, quantityAtDate), // 음수 방지
      unit: snapshot.unit,
      details: itemDetails
    });
  }

  return {
    items,
    targetDate,
    calculationMethod: 'hybrid',
    snapshotDate: latestSnapshotDate
  };
}

/**
 * 항목 상세 정보 조회
 */
async function getItemDetails(
  supabase: any,
  itemType: string,
  itemId: string
): Promise<any> {
  console.log(`Getting item details for type: ${itemType}, id: ${itemId}`);
  
  if (itemType === 'ingredient') {
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('id, name, code_name, unit')
      .eq('id', itemId)
      .single();

    if (error) {
      console.error(`Error fetching ingredient ${itemId}:`, error);
    }
    
    if (!ingredient) {
      console.warn(`Ingredient not found for id: ${itemId}`);
    }

    return ingredient || { id: itemId, name: 'Unknown Ingredient' };
  } else if (itemType === 'container') {
    const { data: container, error } = await supabase
      .from('containers')
      .select('id, name, code_name')
      .eq('id', itemId)
      .single();

    if (error) {
      console.error(`Error fetching container ${itemId}:`, error);
    }
    
    if (!container) {
      console.warn(`Container not found for id: ${itemId}`);
    }

    return container || { id: itemId, name: 'Unknown Container' };
  }

  console.warn(`Unknown item type: ${itemType} for id: ${itemId}`);
  return { id: itemId, name: 'Unknown Item' };
} 