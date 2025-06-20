import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 창고별 재고 정보 타입 정의
interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unit: string;
  lastUpdated?: string;
}

// 창고별 재고 맵 타입 정의
interface WarehouseStocksMap {
  [warehouseId: string]: WarehouseStock;
}

/**
 * 재고 항목 목록 조회 API (검색 및 필터링 지원)
 * 
 * @route GET /api/companies/[id]/stock/items
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 재고 항목 목록 (창고별 재고 포함)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15에서는 params가 Promise이므로 await로 처리
    const { id: companyId } = await params;

    const supabase = createServerSupabaseClient();

    // URL 쿼리 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const itemType = searchParams.get('itemType');
    const stockGrade = searchParams.get('stockGrade');
    const searchQuery = searchParams.get('query');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const warehouseId = searchParams.get('warehouse_id');

    // 창고 목록 조회
    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');

    if (warehousesError) {
      console.error('창고 목록 조회 오류:', warehousesError);
      return NextResponse.json(
        { error: '창고 정보를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 필터 조건에 따른 식재료/용기 ID 조회
    const itemIds = await getFilteredItemIds(supabase, companyId, {
      itemType,
      stockGrade,
      searchQuery
    });

    if (itemIds.length === 0) {
      return NextResponse.json({
        items: [],
        warehouses: warehouses || [],
        pagination: {
          total: 0,
          page,
          pageSize,
          pageCount: 0,
        },
      });
    }

    // 정렬 및 페이지네이션 적용하여 아이템 조회
    const paginatedItems = await getPaginatedItems(supabase, companyId, itemIds, {
      sortBy,
      sortOrder,
      page,
      pageSize
    });

    // 각 아이템에 대한 창고별 재고 정보 조회
    const itemsWithStocks = await attachWarehouseStocks(
      supabase,
      companyId,
      paginatedItems,
      warehouses || [],
      warehouseId
    );

    return NextResponse.json({
      items: itemsWithStocks,
      warehouses: warehouses || [],
      pagination: {
        total: itemIds.length,
        page,
        pageSize,
        pageCount: Math.ceil(itemIds.length / pageSize),
      },
    });

  } catch (error) {
    console.error('재고 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '재고 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 필터 조건에 따라 아이템 ID 목록을 조회
 */
async function getFilteredItemIds(
  supabase: any,
  companyId: string,
  filters: {
    itemType?: string | null;
    stockGrade?: string | null;
    searchQuery?: string | null;
  }
): Promise<Array<{ id: string; type: 'ingredient' | 'container'; name: string }>> {
  const { itemType, stockGrade, searchQuery } = filters;
  const itemIds: Array<{ id: string; type: 'ingredient' | 'container'; name: string }> = [];

  // 식재료 조회
  if (!itemType || itemType === 'ingredient') {
    let ingredientQuery = supabase
      .from('ingredients')
      .select('id, name')
      .eq('company_id', companyId);

    // 등급 필터
    if (stockGrade && stockGrade !== 'all') {
      ingredientQuery = ingredientQuery.eq('stock_grade', stockGrade);
    }

    // 검색어 필터 (이름 또는 코드명)
    if (searchQuery) {
      ingredientQuery = ingredientQuery.or(
        `name.ilike.%${searchQuery}%,code_name.ilike.%${searchQuery}%`
      );
    }

    const { data: ingredients } = await ingredientQuery;
    if (ingredients) {
      itemIds.push(...ingredients.map((item: any) => ({ 
        id: item.id, 
        type: 'ingredient' as const, 
        name: item.name 
      })));
    }
  }

  // 용기 조회 (최상위만) - 등급 필터가 'all'인 경우에만 조회
  if ((!itemType || itemType === 'container') && (!stockGrade || stockGrade === 'all')) {
    let containerQuery = supabase
      .from('containers')
      .select('id, name')
      .eq('company_id', companyId)
      .is('parent_container_id', null);

    // 검색어 필터 (이름 또는 코드명)
    if (searchQuery) {
      containerQuery = containerQuery.or(
        `name.ilike.%${searchQuery}%,code_name.ilike.%${searchQuery}%`
      );
    }

    const { data: containers } = await containerQuery;
    if (containers) {
      itemIds.push(...containers.map((item: any) => ({ 
        id: item.id, 
        type: 'container' as const, 
        name: item.name 
      })));
    }
  }

  return itemIds;
}

/**
 * 정렬 및 페이지네이션을 적용하여 아이템 정보 조회
 */
async function getPaginatedItems(
  supabase: any,
  companyId: string,
  itemIds: Array<{ id: string; type: 'ingredient' | 'container'; name: string }>,
  options: {
    sortBy: string;
    sortOrder: string;
    page: number;
    pageSize: number;
  }
) {
  const { sortBy, sortOrder, page, pageSize } = options;
  
  // 정렬 적용
  if (sortBy === 'name') {
    itemIds.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name, 'ko');
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // 페이지네이션 적용
  const offset = (page - 1) * pageSize;
  const paginatedIds = itemIds.slice(offset, offset + pageSize);

  // 타입별로 분리
  const ingredientIds = paginatedIds.filter(item => item.type === 'ingredient').map(item => item.id);
  const containerIds = paginatedIds.filter(item => item.type === 'container').map(item => item.id);

  const items: any[] = [];

  // 식재료 정보 조회
  if (ingredientIds.length > 0) {
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .in('id', ingredientIds);

    if (ingredients) {
      items.push(...ingredients.map((item: any) => ({
        ...item,
        item_type: 'ingredient'
      })));
    }
  }

  // 용기 정보 조회
  if (containerIds.length > 0) {
    const { data: containers } = await supabase
      .from('containers')
      .select('*')
      .in('id', containerIds);

    if (containers) {
      items.push(...containers.map((item: any) => ({
        ...item,
        item_type: 'container'
      })));
    }
  }

  return items;
}

/**
 * 각 아이템에 창고별 재고 정보 첨부
 */
async function attachWarehouseStocks(
  supabase: any,
  companyId: string,
  items: any[],
  warehouses: any[],
  warehouseId?: string | null
) {
  const ingredientIds = items.filter(item => item.item_type === 'ingredient').map(item => item.id);
  const containerIds = items.filter(item => item.item_type === 'container').map(item => item.id);

  // 모든 재고 정보 조회
  const { data: allStockItems } = await supabase
    .from('stock_items')
    .select('*')
    .eq('company_id', companyId)
    .or(`and(item_type.eq.ingredient,item_id.in.(${ingredientIds.join(',')})),and(item_type.eq.container,item_id.in.(${containerIds.join(',')}))`);

  return items.map(item => {
    // 이 아이템의 재고 정보들
    const itemStocks = allStockItems?.filter((stock: any) => 
      stock.item_id === item.id && stock.item_type === item.item_type
    ) || [];

    // 창고별 재고 맵 생성
    const warehouseStocks: WarehouseStocksMap = {};
    let totalQuantity = 0;
    let latestUpdate = null;

    for (const warehouse of warehouses) {
      const warehouseStock = itemStocks.find((stock: any) => stock.warehouse_id === warehouse.id);
      const quantity = warehouseStock?.current_quantity ?? 0;

      warehouseStocks[warehouse.id] = {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        quantity: quantity,
        unit: warehouseStock?.unit || item.unit || '개',
        lastUpdated: warehouseStock?.last_updated
      };

      totalQuantity += quantity;

      if (warehouseStock?.last_updated) {
        if (!latestUpdate || new Date(warehouseStock.last_updated) > new Date(latestUpdate)) {
          latestUpdate = warehouseStock.last_updated;
        }
      }
    }

    // 창고 필터링이 있는 경우, 해당 창고의 재고량만 표시
    const displayQuantity = warehouseId ? (warehouseStocks[warehouseId]?.quantity ?? 0) : totalQuantity;

    return {
      id: `${item.item_type}_${item.id}`,
      company_id: companyId,
      item_type: item.item_type,
      item_id: item.id,
      current_quantity: displayQuantity,
      unit: item.unit || '개',
      last_updated: latestUpdate || new Date().toISOString(),
      created_at: item.created_at || new Date().toISOString(),
      details: {
        ...item,
        price: item.price || undefined
      },
      name: item.name || '알 수 없음',
      warehouseStocks: warehouseStocks
    };
  });
}
