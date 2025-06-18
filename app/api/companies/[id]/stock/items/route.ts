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
 * 재고 항목 목록 조회 API
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

    // Note: Authentication check is handled by middleware for public routes.
    // If specific actions within this route require authentication,
    // implement checks here based on the user's needs after fetching data.
    // For now, assuming public access to list items.

    // 사용자가 회사의 멤버인지 확인 (이 부분은 데이터를 필터링하거나 특정 작업을 수행할 때 필요할 수 있습니다)
    // 현재는 목록 조회이므로 멤버십 확인은 필요하지 않을 수 있습니다.
    // 필요하다면 userId를 가져와서 멤버십을 확인하는 로직을 추가하세요.
    // const { userId } = await auth(); // 필요한 경우 주석 해제
    // const { data: membership, error: membershipError } = await supabase
    //   .from('company_memberships')
    //   .select('role')
    //   .eq('company_id', companyId)
    //   .eq('user_id', userId)
    //   .single();

    // if (membershipError || !membership) {
    //   return NextResponse.json(
    //     { error: '이 회사에 접근할 권한이 없습니다.' },
    //     { status: 403 }
    //   );
    // }

    // URL 쿼리 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const itemType = searchParams.get('itemType');
    const category = searchParams.get('category');
    const stockGrade = searchParams.get('stockGrade');
    const searchQuery = searchParams.get('query');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const warehouseId = searchParams.get('warehouse_id'); // 창고 필터 (표시용으로만 사용)

    // 먼저 회사의 모든 창고 정보를 가져오기
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

    // 모든 재고 항목 목록을 저장할 배열
    let allItems = [];
    let totalCount = 0;

    // 필터 기준에 따라 조회할 항목 결정
    const shouldIncludeIngredients = !itemType || itemType === 'ingredient';
    const shouldIncludeContainers = !itemType || itemType === 'container';

    // 현재 회사에서 사용 가능한 항목 ID 목록 조회
    let availableIngredientIds = [];
    let availableContainerIds = [];

    // 1. 회사에서 사용 가능한 식자재 ID 목록 조회
    if (shouldIncludeIngredients) {
      try {
        let ingredientQuery = supabase
          .from('ingredients')
          .select('id')
          .eq('company_id', companyId);
        
        // 검색어나 카테고리 필터가 있으면 먼저 적용
        if (searchQuery) {
          const nameResults = await supabase
            .from('ingredients')
            .select('id')
            .eq('company_id', companyId)
            .ilike('name', `%${searchQuery}%`);
            
          const codeResults = await supabase
            .from('ingredients')
            .select('id')
            .eq('company_id', companyId)
            .ilike('code_name', `%${searchQuery}%`);
            
          const nameIds = nameResults.data?.map(item => item.id) || [];
          const codeIds = codeResults.data?.map(item => item.id) || [];
          const combinedIds = [...new Set([...nameIds, ...codeIds])];
          
          if (combinedIds.length > 0) {
            ingredientQuery = ingredientQuery.in('id', combinedIds);
          } else {
            ingredientQuery = ingredientQuery.eq('id', 'no-match');
          }
        }
        
        if (category) {
          ingredientQuery = ingredientQuery.ilike('category', `%${category}%`);
        }
        
        if (stockGrade && stockGrade !== 'all') {
          ingredientQuery = ingredientQuery.eq('stock_grade', stockGrade);
        } else {
          ingredientQuery = ingredientQuery.not('stock_grade', 'is', null);
        }
        
        const { data: ingredients, error: ingredientsError } = await ingredientQuery;
        
        if (!ingredientsError && ingredients) {
          availableIngredientIds = ingredients.map(item => item.id);
        } else {
          console.error('식자재 ID 조회 오류:', ingredientsError);
        }
      } catch (err) {
        console.error('식자재 매핑 조회 오류:', err);
      }
    }

    // 2. 회사에서 사용 가능한 용기 ID 목록 조회 (최상위 레벨만)
    if (shouldIncludeContainers) {
      try {
        let containerQuery = supabase
          .from('containers')
          .select('id')
          .eq('company_id', companyId)
          .is('parent_container_id', null);
        
        if (searchQuery) {
          const nameResults = await supabase
            .from('containers')
            .select('id')
            .eq('company_id', companyId)
            .is('parent_container_id', null)
            .ilike('name', `%${searchQuery}%`);
            
          const codeResults = await supabase
            .from('containers')
            .select('id')
            .eq('company_id', companyId)
            .is('parent_container_id', null)
            .ilike('code_name', `%${searchQuery}%`);
            
          const nameIds = nameResults.data?.map(item => item.id) || [];
          const codeIds = codeResults.data?.map(item => item.id) || [];
          const combinedIds = [...new Set([...nameIds, ...codeIds])];
          
          if (combinedIds.length > 0) {
            containerQuery = containerQuery.in('id', combinedIds);
          } else {
            availableContainerIds = [];
          }
        }
        
        if (category) {
          containerQuery = containerQuery.ilike('category', `%${category}%`);
        }
        
        const { data: containers, error: containersError } = await containerQuery;
        
        if (!containersError && containers) {
          availableContainerIds = containers.map(item => item.id);
        } else {
          console.error('용기 ID 조회 오류:', containersError);
        }
      } catch (err) {
        console.error('용기 매핑 조회 오류:', err);
      }
    }

    // 3. 식자재 조회 및 창고별 재고 항목 조회
    if (shouldIncludeIngredients && availableIngredientIds.length > 0) {
      const { count: ingredientCount, error: countError } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true })
        .in('id', availableIngredientIds);
      
      if (countError) {
        console.error('식자재 카운트 조회 오류:', countError);
      } else {
        totalCount += ingredientCount || 0;
      }
      
      const limit = shouldIncludeContainers ? Math.floor(pageSize / 2) : pageSize;
      const offset = shouldIncludeContainers ? Math.floor((page - 1) * pageSize / 2) : (page - 1) * pageSize;
      
      let ingredientQuery = supabase
        .from('ingredients')
        .select('*')
        .in('id', availableIngredientIds);
        
      if (sortBy === 'name') {
        ingredientQuery = ingredientQuery.order('name', { ascending: sortOrder === 'asc' });
      } else if (sortBy === 'code_name') {
        ingredientQuery = ingredientQuery.order('code_name', { ascending: sortOrder === 'asc' });
      } else {
        ingredientQuery = ingredientQuery.order('created_at', { ascending: sortOrder === 'asc' });
      }
      
      ingredientQuery = ingredientQuery.range(offset, offset + limit - 1);
      
      const { data: ingredients, error: ingredientsError } = await ingredientQuery;
      
      if (ingredientsError) {
        console.error('식자재 조회 오류:', ingredientsError);
      } else if (ingredients && ingredients.length > 0) {
        const selectedIngredientIds = ingredients.map(ingredient => ingredient.id);
        
        // 모든 창고의 재고 항목 조회 (창고 필터링 없이)
        const { data: allStockItems, error: stockItemsError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .in('item_id', selectedIngredientIds);
          
        if (stockItemsError) {
          console.error('재고 항목 조회 오류:', stockItemsError);
        }
        
        // 식자재 정보와 창고별 재고 항목 정보 결합
        for (const ingredient of ingredients) {
          // 이 식자재에 대한 모든 창고의 재고 항목 찾기
          const itemStocksByWarehouse = allStockItems?.filter(item => item.item_id === ingredient.id) || [];
          
          // 창고별 재고 맵 생성
          const warehouseStocks: WarehouseStocksMap = {};
          let totalQuantity = 0;
          let latestUpdate = null;
          
          for (const warehouse of warehouses) {
            const warehouseStock = itemStocksByWarehouse.find(stock => stock.warehouse_id === warehouse.id);
            const quantity = warehouseStock?.current_quantity ?? 0;
            
            warehouseStocks[warehouse.id] = {
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              quantity: quantity,
              unit: warehouseStock?.unit || ingredient.unit || '개',
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
          
          allItems.push({
            id: `ingredient_${ingredient.id}`,
            company_id: companyId,
            item_type: 'ingredient',
            item_id: ingredient.id,
            current_quantity: displayQuantity,
            unit: ingredient.unit || '개',
            last_updated: latestUpdate || new Date().toISOString(),
            created_at: ingredient.created_at || new Date().toISOString(),
            details: {
              ...ingredient,
              price: ingredient.price || undefined
            },
            name: ingredient.name || '알 수 없음',
            warehouseStocks: warehouseStocks
          });
        }
      }
    }

    // 4. 용기 조회 및 창고별 재고 항목 조회
    if (shouldIncludeContainers && availableContainerIds.length > 0) {
      const { count: containerCount, error: countError } = await supabase
        .from('containers')
        .select('*', { count: 'exact', head: true })
        .in('id', availableContainerIds)
        .is('parent_container_id', null);
      
      if (countError) {
        console.error('용기 카운트 조회 오류:', countError);
      } else {
        totalCount += containerCount || 0;
      }
      
      const limit = shouldIncludeIngredients ? Math.floor(pageSize / 2) : pageSize;
      const offset = shouldIncludeIngredients ? Math.floor((page - 1) * pageSize / 2) : (page - 1) * pageSize;
      
      let containerQuery = supabase
        .from('containers')
        .select('*')
        .in('id', availableContainerIds)
        .is('parent_container_id', null);
        
      if (sortBy === 'name') {
        containerQuery = containerQuery.order('name', { ascending: sortOrder === 'asc' });
      } else if (sortBy === 'code_name') {
        containerQuery = containerQuery.order('code_name', { ascending: sortOrder === 'asc' });
      } else {
        containerQuery = containerQuery.order('created_at', { ascending: sortOrder === 'asc' });
      }
      
      containerQuery = containerQuery.range(offset, offset + limit - 1);
      
      const { data: containers, error: containersError } = await containerQuery;
      
      if (containersError) {
        console.error('용기 조회 오류:', containersError);
      } else if (containers && containers.length > 0) {
        const selectedContainerIds = containers.map(container => container.id);
        
        // 모든 창고의 재고 항목 조회 (창고 필터링 없이)
        const { data: allStockItems, error: stockItemsError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', selectedContainerIds);
          
        if (stockItemsError) {
          console.error('재고 항목 조회 오류:', stockItemsError);
        }
        
        // 용기 정보와 창고별 재고 항목 정보 결합
        for (const topContainer of containers) {
          // 하위 컨테이너들 조회
          const { data: subContainers, error: subError } = await supabase
            .from('containers')
            .select('id, name, parent_container_id')
            .eq('company_id', companyId)
            .eq('parent_container_id', topContainer.id);

          if (subError) {
            console.error('하위 컨테이너 조회 오류:', subError);
            continue;
          }

          // 창고별 재고 맵 생성
          const warehouseStocks: WarehouseStocksMap = {};
          let totalQuantity = 0;
          let latestUpdate = null;
          
          for (const warehouse of warehouses) {
            let warehouseQuantity = 0;
            let warehouseLastUpdated = null;
            
            if (subContainers && subContainers.length > 0) {
              // 하위 컨테이너들이 있는 경우
              const subContainerIds = subContainers.map(sub => sub.id);
              const subStockItems = allStockItems?.filter(stock => 
                subContainerIds.includes(stock.item_id) && stock.warehouse_id === warehouse.id
              ) || [];
              
              // 상위 그룹 자체의 재고 확인
              const parentStockItem = allStockItems?.find(item => 
                item.item_id === topContainer.id && item.warehouse_id === warehouse.id
              );
              
              if (parentStockItem) {
                warehouseQuantity = parentStockItem.current_quantity ?? 0;
                warehouseLastUpdated = parentStockItem.last_updated;
              } else if (subStockItems.length > 0) {
                // 하위 컨테이너들의 최대 재고량 찾기
                const maxSubStock = subStockItems.reduce((max, current) => {
                  return (current.current_quantity ?? 0) > (max.current_quantity ?? 0) ? current : max;
                }, subStockItems[0]);
                
                warehouseQuantity = maxSubStock.current_quantity ?? 0;
                warehouseLastUpdated = maxSubStock.last_updated;
              }
            } else {
              // 하위 컨테이너가 없는 경우
              const stockItem = allStockItems?.find(item => 
                item.item_id === topContainer.id && item.warehouse_id === warehouse.id
              );
              
              warehouseQuantity = stockItem?.current_quantity ?? 0;
              warehouseLastUpdated = stockItem?.last_updated;
            }
            
            warehouseStocks[warehouse.id] = {
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              quantity: warehouseQuantity,
              unit: '개',
              lastUpdated: warehouseLastUpdated
            };
            
            totalQuantity += warehouseQuantity;
            
            if (warehouseLastUpdated) {
              if (!latestUpdate || new Date(warehouseLastUpdated) > new Date(latestUpdate)) {
                latestUpdate = warehouseLastUpdated;
              }
            }
          }
          
          // 창고 필터링이 있는 경우, 해당 창고의 재고량만 표시
          const displayQuantity = warehouseId ? (warehouseStocks[warehouseId]?.quantity ?? 0) : totalQuantity;
          
          allItems.push({
            id: `container_${topContainer.id}`,
            company_id: companyId,
            item_type: 'container',
            item_id: topContainer.id,
            current_quantity: displayQuantity,
            unit: '개',
            last_updated: latestUpdate || new Date().toISOString(),
            created_at: topContainer.created_at || new Date().toISOString(),
            details: {
              ...topContainer,
              price: topContainer.price || undefined
            },
            name: topContainer.name || '알 수 없음',
            warehouseStocks: warehouseStocks
          });
        }
      }
    }

    // 메모리에서 정렬 적용
    if (sortBy === 'name') {
      allItems.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      });
    } else if (sortBy === 'code_name') {
      allItems.sort((a, b) => {
        const codeA = a.details?.code_name || '';
        const codeB = b.details?.code_name || '';
        return sortOrder === 'asc'
          ? codeA.localeCompare(codeB)
          : codeB.localeCompare(codeA);
      });
    } else if (sortBy === 'current_quantity') {
      allItems.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.current_quantity - b.current_quantity
          : b.current_quantity - a.current_quantity;
      });
    }

    // 응답 반환 (창고 정보 포함)
    return NextResponse.json({
      items: allItems,
      warehouses: warehouses || [],
      pagination: {
        total: totalCount,
        page,
        pageSize,
        pageCount: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('재고 항목 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
