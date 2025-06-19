import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 특정 재고 항목 상세 조회 API
 * 
 * @route GET /api/companies/[id]/stock/items/[itemId]
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID, 재고 항목 ID)
 * @returns 재고 항목 상세 정보
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    // Next.js 15에서는 params가 Promise이므로 await로 처리
    const { id: companyId, itemId } = await params;
    const { userId } = await auth();

    console.log('재고 항목 상세 조회 API 호출:', { companyId, itemId, userId });

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

    // itemId 파싱: ingredient_xxx 또는 container_xxx 형태인지 확인
    let itemType: 'ingredient' | 'container';
    let actualItemId: string;

    if (itemId.startsWith('ingredient_')) {
      itemType = 'ingredient';
      actualItemId = itemId.replace('ingredient_', '');
    } else if (itemId.startsWith('container_')) {
      itemType = 'container';
      actualItemId = itemId.replace('container_', '');
    } else {
      // 기존 방식 호환성을 위해 stock_items.id로 직접 조회 시도
      console.log('기존 형식의 itemId 감지, stock_items.id로 직접 조회 시도:', itemId);
      
      const { data: stockItem, error: stockItemError } = await supabase
        .from('stock_items')
        .select('*')
        .eq('id', itemId)
        .eq('company_id', companyId)
        .single();

      if (stockItemError) {
        console.error('기존 방식 조회 실패:', stockItemError);
        return NextResponse.json(
          { error: '재고 항목을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 기존 방식으로 조회 성공한 경우 처리
      itemType = stockItem.item_type;
      actualItemId = stockItem.item_id;
    }

    console.log('파싱된 정보:', { itemType, actualItemId });

    // 실제 아이템 정보 조회 (ingredients 또는 containers 테이블에서)
    let itemDetails = null;
    
    if (itemType === 'ingredient') {
      const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', actualItemId)
        .eq('company_id', companyId)
        .single();
      
      if (ingredientError) {
        console.error('식재료 조회 오류:', ingredientError);
        return NextResponse.json(
          { error: '식재료 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      itemDetails = ingredient;
    } else if (itemType === 'container') {
      const { data: container, error: containerError } = await supabase
        .from('containers')
        .select('*')
        .eq('id', actualItemId)
        .eq('company_id', companyId)
        .single();
      
      if (containerError) {
        console.error('용기 조회 오류:', containerError);
        return NextResponse.json(
          { error: '용기 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      itemDetails = container;
    }

    // 해당 아이템의 모든 창고별 재고 항목 조회
    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('item_type', itemType)
      .eq('item_id', actualItemId);

    if (stockItemsError) {
      console.error('재고 항목들 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 정보를 조회하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 창고 정보 조회
    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');

    if (warehousesError) {
      console.error('창고 목록 조회 오류:', warehousesError);
    }

    // 창고별 재고 정보 구성
    const warehouseStocks: { [warehouseId: string]: any } = {};
    let totalQuantity = 0;
    let latestUpdate = null;

    if (warehouses) {
      for (const warehouse of warehouses) {
        const warehouseStock = stockItems?.find(stock => stock.warehouse_id === warehouse.id);
        const quantity = warehouseStock?.current_quantity ?? 0;
        
        warehouseStocks[warehouse.id] = {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          quantity: quantity,
          unit: warehouseStock?.unit || itemDetails?.unit || '개',
          lastUpdated: warehouseStock?.last_updated
        };
        
        totalQuantity += quantity;
        
        if (warehouseStock?.last_updated) {
          if (!latestUpdate || new Date(warehouseStock.last_updated) > new Date(latestUpdate)) {
            latestUpdate = warehouseStock.last_updated;
          }
        }
      }
    }

    // 최근 거래 내역 가져오기 (모든 창고의 재고 항목에 대해)
    const stockItemIds = stockItems?.map(item => item.id) || [];
    let recentTransactions = [];
    
    if (stockItemIds.length > 0) {
      const { data: transactions, error: transactionsError } = await supabase
        .from('stock_transactions')
        .select('*')
        .in('stock_item_id', stockItemIds)
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('거래 내역 조회 오류:', transactionsError);
      } else {
        recentTransactions = transactions || [];
      }
    }

    // 대표 재고 항목 생성 (UI 호환성을 위해)
    const representativeStockItem = {
      id: itemId, // 원본 조합된 ID 유지
      company_id: companyId,
      item_type: itemType,
      item_id: actualItemId,
      current_quantity: totalQuantity,
      unit: itemDetails?.unit || '개',
      last_updated: latestUpdate || new Date().toISOString(),
      created_at: itemDetails?.created_at || new Date().toISOString(),
      warehouse_id: null, // 전체 창고를 대표하므로 null
    };

    console.log('조회 성공:', {
      itemId,
      itemType,
      actualItemId,
      totalQuantity,
      warehouseCount: Object.keys(warehouseStocks).length
    });

    // 응답 반환
    return NextResponse.json({
      item: {
        ...representativeStockItem,
        details: itemDetails,
        warehouseStocks: warehouseStocks,
        recentTransactions: recentTransactions,
        stockItemIds: stockItemIds
      }
    });
  } catch (error) {
    console.error('재고 항목 상세 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 