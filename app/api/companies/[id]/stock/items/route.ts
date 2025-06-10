import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 재고 항목 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/items
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 재고 항목 목록
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
    // 페이지 당 아이템 수 제한을 더 낮게 설정하여 성능 개선
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

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
        // 우선 company_ingredients 매핑 테이블이 있는지 확인
        let ingredientQuery = supabase
          .from('ingredients')
          .select('id')
          .eq('company_id', companyId);
        
        // 검색어나 카테고리 필터가 있으면 먼저 적용
        if (searchQuery) {
          // PostgREST의 or 쿼리에서 특수문자 문제를 피하기 위해 별도 쿼리로 분리
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
            
          // 두 결과를 합치고 중복 제거
          const nameIds = nameResults.data?.map(item => item.id) || [];
          const codeIds = codeResults.data?.map(item => item.id) || [];
          const combinedIds = [...new Set([...nameIds, ...codeIds])];
          
          if (combinedIds.length > 0) {
            ingredientQuery = ingredientQuery.in('id', combinedIds);
          } else {
            // 검색 결과가 없으면 빈 결과 반환
            ingredientQuery = ingredientQuery.eq('id', 'no-match');
          }
        }
        
        if (category) {
          ingredientQuery = ingredientQuery.ilike('category', `%${category}%`);
        }
        
        // 재고 등급 필터 적용
        if (stockGrade && stockGrade !== 'all') {
          ingredientQuery = ingredientQuery.eq('stock_grade', stockGrade);
        } else {
          // stockGrade가 없거나 'all'인 경우, 재고관리 등급이 있는 모든 식자재 조회
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
          .is('parent_container_id', null); // 상위 그룹이 없는 컨테이너만 조회
        
        // 검색어나 카테고리 필터가 있으면 먼저 적용
        if (searchQuery) {
          // PostgREST의 or 쿼리에서 특수문자 문제를 피하기 위해 별도 쿼리로 분리
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
            
          // 두 결과를 합치고 중복 제거
          const nameIds = nameResults.data?.map(item => item.id) || [];
          const codeIds = codeResults.data?.map(item => item.id) || [];
          const combinedIds = [...new Set([...nameIds, ...codeIds])];
          
          if (combinedIds.length > 0) {
            containerQuery = containerQuery.in('id', combinedIds);
          } else {
            // 검색 결과가 없으면 빈 배열 설정하고 건너뛰기
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

    // 3. 식자재 조회 및 재고 항목 조회를 단일 쿼리로 최적화
    if (shouldIncludeIngredients && availableIngredientIds.length > 0) {
      // 전체 카운트만 먼저 가져오기
      const { count: ingredientCount, error: countError } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true })
        .in('id', availableIngredientIds);
      
      if (countError) {
        console.error('식자재 카운트 조회 오류:', countError);
      } else {
        totalCount += ingredientCount || 0;
      }
      
      // 페이지네이션 및 정렬 적용 후 데이터 가져오기
      const limit = shouldIncludeContainers ? Math.floor(pageSize / 2) : pageSize;
      const offset = shouldIncludeContainers ? Math.floor((page - 1) * pageSize / 2) : (page - 1) * pageSize;
      
      let ingredientQuery = supabase
        .from('ingredients')
        .select('*')
        .in('id', availableIngredientIds);
        
      // 정렬 조건 적용
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
        // 선택된 식자재 ID 목록
        const selectedIngredientIds = ingredients.map(ingredient => ingredient.id);
        
        // 해당 식자재에 대한 재고 항목 한 번에 조회
        const { data: stockItems, error: stockItemsError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .in('item_id', selectedIngredientIds);
          
        if (stockItemsError) {
          console.error('재고 항목 조회 오류:', stockItemsError);
        }
        
        // 식자재 정보와 재고 항목 정보 결합
        for (const ingredient of ingredients) {
          // 이 식자재에 대한 재고 항목 찾기
          const stockItem = stockItems && stockItems.find(item => item.item_id === ingredient.id);
          
          // 재고 정보가 있으면 그 정보를 사용하고, 없으면 기본값 사용
          allItems.push({
            id: stockItem?.id || `temp_ingredient_${ingredient.id}`,
            company_id: companyId,
            item_type: 'ingredient',
            item_id: ingredient.id,
            current_quantity: stockItem?.current_quantity || 0,
            unit: stockItem?.unit || ingredient.unit || '개',
            last_updated: stockItem?.last_updated || new Date().toISOString(),
            created_at: stockItem?.created_at || new Date().toISOString(),
            details: {
              ...ingredient,
              price: ingredient.price || undefined
            },
            name: ingredient.name || '알 수 없음'
          });
        }
      }
    }

    // 4. 용기 조회 (필터에 따라) - 식자재 조회와 동일한 방식으로 최적화
    if (shouldIncludeContainers && availableContainerIds.length > 0) {
      // 전체 카운트만 먼저 가져오기
      const { count: containerCount, error: countError } = await supabase
        .from('containers')
        .select('*', { count: 'exact', head: true })
        .in('id', availableContainerIds)
        .is('parent_container_id', null); // 최상위 레벨 컨테이너만 카운트
      
      if (countError) {
        console.error('용기 카운트 조회 오류:', countError);
      } else {
        totalCount += containerCount || 0;
      }
      
      // 페이지네이션 및 정렬 적용 후 데이터 가져오기
      const limit = shouldIncludeIngredients ? Math.floor(pageSize / 2) : pageSize;
      const offset = shouldIncludeIngredients ? Math.floor((page - 1) * pageSize / 2) : (page - 1) * pageSize;
      
      let containerQuery = supabase
        .from('containers')
        .select('*')
        .in('id', availableContainerIds)
        .is('parent_container_id', null); // 최상위 레벨 컨테이너만 조회
        
      // 정렬 조건 적용
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
        // 선택된 용기 ID 목록
        const selectedContainerIds = containers.map(container => container.id);
        
        // 해당 용기에 대한 재고 항목 한 번에 조회
        const { data: stockItems, error: stockItemsError } = await supabase
          .from('stock_items')
          .select('*')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', selectedContainerIds);
          
        if (stockItemsError) {
          console.error('재고 항목 조회 오류:', stockItemsError);
        }
        
        // 하위 컨테이너들을 상위 그룹별로 그룹화하고 최대 수량으로 집계
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

          // 하위 컨테이너들이 있으면 각각의 재고를 확인하여 최대값 찾기
          if (subContainers && subContainers.length > 0) {
            const subContainerIds = subContainers.map(sub => sub.id);
            const { data: subStockItems, error: subStockError } = await supabase
              .from('stock_items')
              .select('*')
              .eq('company_id', companyId)
              .eq('item_type', 'container')
              .in('item_id', subContainerIds);

            if (subStockError) {
              console.error('하위 컨테이너 재고 조회 오류:', subStockError);
              continue;
            }

            // 상위 그룹 자체의 재고 확인
            const parentStockItem = stockItems && stockItems.find(item => item.item_id === topContainer.id);
            const parentQuantity = parentStockItem?.current_quantity || 0;
            
            // 하위 컨테이너들의 최대 재고량 찾기
            let maxSubQuantity = 0;
            let maxSubStockItem = null;
            
            for (const subContainer of subContainers) {
              const subStockItem = subStockItems?.find(stock => stock.item_id === subContainer.id);
              const quantity = subStockItem?.current_quantity || 0;
              
              if (quantity > maxSubQuantity) {
                maxSubQuantity = quantity;
                maxSubStockItem = subStockItem;
              }
            }
            
            // 상위 그룹 재고와 하위 컨테이너들의 최대 재고 중 더 큰 값 사용
            let finalQuantity = parentQuantity;
            let finalStockItem = parentStockItem;
            
            if (maxSubQuantity > parentQuantity) {
              finalQuantity = maxSubQuantity;
              finalStockItem = maxSubStockItem;
            }
            
            // 최종 사용할 재고 정보 설정
            const maxQuantity = finalQuantity;
            const maxStockItem = finalStockItem;

            // 상위 그룹으로 항목 추가 (최대 수량 사용)
            allItems.push({
              id: maxStockItem?.id || `temp_container_${topContainer.id}`,
              company_id: companyId,
              item_type: 'container',
              item_id: topContainer.id, // 상위 그룹 ID 사용
              current_quantity: maxQuantity, // 하위 중 최대 수량
              unit: maxStockItem?.unit || '개',
              last_updated: maxStockItem?.last_updated || new Date().toISOString(),
              created_at: maxStockItem?.created_at || new Date().toISOString(),
              details: {
                ...topContainer,
                price: topContainer.price || undefined
              },
              name: topContainer.name || '알 수 없음' // 상위 그룹명 사용
            });
          } else {
            // 하위 컨테이너가 없으면 그 자체로 처리
            const stockItem = stockItems && stockItems.find(item => item.item_id === topContainer.id);
            
            allItems.push({
              id: stockItem?.id || `temp_container_${topContainer.id}`,
              company_id: companyId,
              item_type: 'container',
              item_id: topContainer.id,
              current_quantity: stockItem?.current_quantity || 0,
              unit: stockItem?.unit || '개',
              last_updated: stockItem?.last_updated || new Date().toISOString(),
              created_at: stockItem?.created_at || new Date().toISOString(),
              details: {
                ...topContainer,
                price: topContainer.price || undefined
              },
              name: topContainer.name || '알 수 없음'
            });
          }
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
    } else if (sortBy === 'last_updated') {
      allItems.sort((a, b) => {
        return sortOrder === 'asc'
          ? new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
          : new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
      });
    } else if (sortBy === 'created_at') {
      allItems.sort((a, b) => {
        return sortOrder === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    // 이미 각 쿼리에서 페이지네이션이 적용되어 있으므로 다시 슬라이싱하지 않음
    const paginatedItems = allItems;

    // 응답 반환
    return NextResponse.json({
      items: paginatedItems,
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
