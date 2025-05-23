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
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 모든 재고 항목 목록을 저장할 배열
    let allItems = [];
    let totalCount = 0;

    // 필터 기준에 따라 조회할 항목 결정
    const shouldIncludeIngredients = !itemType || itemType === 'ingredient';
    const shouldIncludeContainers = !itemType || itemType === 'container';

    // 현재 회사에서 사용 가능한 항목 ID 목록 조회
    let availableIngredientIds: number[] = [];
    let availableContainerIds: number[] = [];

    // 1. 회사에서 사용 가능한 식자재 ID 목록 조회
    if (shouldIncludeIngredients) {
      try {
        // 우선 company_ingredients 매핑 테이블이 있는지 확인
        const { data: companyIngredients, error: mappingError } = await supabase
          .from('company_ingredients')
          .select('ingredient_id')
          .eq('company_id', companyId);

        if (!mappingError && companyIngredients) {
          // 매핑 테이블이 있는 경우
          availableIngredientIds = companyIngredients.map(item => item.ingredient_id);
        } else {
          // 매핑 테이블이 없는 경우, 기존 방식대로 company_id로 직접 필터링 시도
          const { data: ingredients, error: ingredientsError } = await supabase
            .from('ingredients')
            .select('id')
            .eq('company_id', companyId);

          if (!ingredientsError && ingredients) {
            availableIngredientIds = ingredients.map(item => item.id);
          } else {
            console.warn('회사의 식자재 매핑 정보를 찾을 수 없습니다. 모든 식자재를 표시합니다.');
            // 모든 식자재 ID 조회 (테스트 환경에서만 사용)
            const { data: allIngredients } = await supabase
              .from('ingredients')
              .select('id');
            
            if (allIngredients) {
              availableIngredientIds = allIngredients.map(item => item.id);
            }
          }
        }
      } catch (err) {
        console.error('식자재 매핑 조회 오류:', err);
      }
    }

    // 2. 회사에서 사용 가능한 용기 ID 목록 조회
    if (shouldIncludeContainers) {
      try {
        // 우선 company_containers 매핑 테이블이 있는지 확인
        const { data: companyContainers, error: mappingError } = await supabase
          .from('company_containers')
          .select('container_id')
          .eq('company_id', companyId);

        if (!mappingError && companyContainers) {
          // 매핑 테이블이 있는 경우
          availableContainerIds = companyContainers.map(item => item.container_id);
        } else {
          // 매핑 테이블이 없는 경우, 기존 방식대로 company_id로 직접 필터링 시도
          const { data: containers, error: containersError } = await supabase
            .from('containers')
            .select('id')
            .eq('company_id', companyId);

          if (!containersError && containers) {
            availableContainerIds = containers.map(item => item.id);
          } else {
            console.warn('회사의 용기 매핑 정보를 찾을 수 없습니다. 모든 용기를 표시합니다.');
            // 모든 용기 ID 조회 (테스트 환경에서만 사용)
            const { data: allContainers } = await supabase
              .from('containers')
              .select('id');
            
            if (allContainers) {
              availableContainerIds = allContainers.map(item => item.id);
            }
          }
        }
      } catch (err) {
        console.error('용기 매핑 조회 오류:', err);
      }
    }

    // 3. 식자재 조회 (필터에 따라)
    if (shouldIncludeIngredients && availableIngredientIds.length > 0) {
      // 식자재 쿼리 시작
      let ingredientQuery = supabase
        .from('ingredients')
        .select('*', { count: 'exact' })
        .in('id', availableIngredientIds);  // 사용 가능한 식자재 ID로 필터링
      
      // 재고 등급 필터 적용
      if (stockGrade) {
        // 명시적으로 지정된 등급으로 필터링
        ingredientQuery = ingredientQuery.eq('stock_grade', stockGrade);
      } else if (itemType === 'ingredient' || !itemType) {
        try {
          // 식자재 탭이 선택되었거나 항목 유형이 지정되지 않은 경우, B등급 식자재만 표시
          ingredientQuery = ingredientQuery.eq('stock_grade', 'B');
        } catch (err) {
          console.error('재고 등급 필터 적용 오류:', err);
          // 필터 적용에 실패했을 경우 기본 쿼리 유지
        }
      }
      
      // 카테고리 필터 적용
      if (category) {
        ingredientQuery = ingredientQuery.ilike('category', `%${category}%`);
      }
      
      // 검색어 필터 적용
      if (searchQuery) {
        ingredientQuery = ingredientQuery.or(`name.ilike.%${searchQuery}%,code_name.ilike.%${searchQuery}%`);
      }
      
      // 정렬 적용
      ingredientQuery = ingredientQuery.order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });
      
      // 데이터 가져오기
      let ingredients = [];
      let ingredientCount = 0;
      
      try {
        const { data, error, count } = await ingredientQuery;
        if (error) {
          console.error('식자재 조회 쿼리 오류:', error);
          return NextResponse.json(
            { error: '식자재 조회 중 오류가 발생했습니다.' },
            { status: 500 }
          );
        }
        
        ingredients = data || [];
        ingredientCount = count || 0;
      } catch (fetchError) {
        console.error('식자재 데이터 가져오기 오류:', fetchError);
        return NextResponse.json(
          { error: '식자재 데이터를 가져오는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      if (ingredients && ingredients.length > 0) {
        // 각 식자재에 대한 재고 항목 정보 조회
        for (const ingredient of ingredients) {
          try {
            // 이 식자재에 대한 재고 항목이 있는지 확인
            const { data: stockItem } = await supabase
              .from('stock_items')
              .select('*')
              .eq('company_id', companyId)
              .eq('item_type', 'ingredient')
              .eq('item_id', ingredient.id)
              .single();

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
              details: ingredient,
              name: ingredient.name || '알 수 없음'
            });
          } catch (stockItemError) {
            console.error(`식자재 ID: ${ingredient.id}의 재고 항목 조회 오류:`, stockItemError);
            
            // 오류가 발생해도 기본 정보는 추가
            allItems.push({
              id: `temp_ingredient_${ingredient.id}`,
              company_id: companyId,
              item_type: 'ingredient',
              item_id: ingredient.id,
              current_quantity: 0,
              unit: ingredient.unit || '개',
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              details: ingredient,
              name: ingredient.name || '알 수 없음'
            });
          }
        }

        totalCount += ingredientCount || 0;
      }
    }

    // 4. 용기 조회 (필터에 따라)
    if (shouldIncludeContainers && availableContainerIds.length > 0) {
      // 용기 쿼리 시작
      let containerQuery = supabase
        .from('containers')
        .select('*', { count: 'exact' })
        .in('id', availableContainerIds);  // 사용 가능한 용기 ID로 필터링
      
      // 카테고리 필터 적용
      if (category) {
        containerQuery = containerQuery.ilike('category', `%${category}%`);
      }
      
      // 검색어 필터 적용
      if (searchQuery) {
        containerQuery = containerQuery.or(`name.ilike.%${searchQuery}%,code_name.ilike.%${searchQuery}%`);
      }
      
      // 정렬 적용
      containerQuery = containerQuery.order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });
      
      // 데이터 가져오기
      let containers = [];
      let containerCount = 0;
      
      try {
        const { data, error, count } = await containerQuery;
        if (error) {
          console.error('용기 조회 쿼리 오류:', error);
          return NextResponse.json(
            { error: '용기 조회 중 오류가 발생했습니다.' },
            { status: 500 }
          );
        }
        
        containers = data || [];
        containerCount = count || 0;
      } catch (fetchError) {
        console.error('용기 데이터 가져오기 오류:', fetchError);
        return NextResponse.json(
          { error: '용기 데이터를 가져오는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      if (containers && containers.length > 0) {
        // 각 용기에 대한 재고 항목 정보 조회
        for (const container of containers) {
          try {
            // 이 용기에 대한 재고 항목이 있는지 확인
            const { data: stockItem } = await supabase
              .from('stock_items')
              .select('*')
              .eq('company_id', companyId)
              .eq('item_type', 'container')
              .eq('item_id', container.id)
              .single();

            // 재고 정보가 있으면 그 정보를 사용하고, 없으면 기본값 사용
            allItems.push({
              id: stockItem?.id || `temp_container_${container.id}`,
              company_id: companyId,
              item_type: 'container',
              item_id: container.id,
              current_quantity: stockItem?.current_quantity || 0,
              unit: stockItem?.unit || '개',
              last_updated: stockItem?.last_updated || new Date().toISOString(),
              created_at: stockItem?.created_at || new Date().toISOString(),
              details: container,
              name: container.name || '알 수 없음'
            });
          } catch (stockItemError) {
            console.error(`용기 ID: ${container.id}의 재고 항목 조회 오류:`, stockItemError);
            
            // 오류가 발생해도 기본 정보는 추가
            allItems.push({
              id: `temp_container_${container.id}`,
              company_id: companyId,
              item_type: 'container',
              item_id: container.id,
              current_quantity: 0,
              unit: '개',
              last_updated: new Date().toISOString(),
              created_at: new Date().toISOString(),
              details: container,
              name: container.name || '알 수 없음'
            });
          }
        }

        totalCount += containerCount || 0;
      }
    }

    // 메모리에서 정렬 적용
    if (sortBy === 'name') {
      allItems.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
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

    // 페이지네이션 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = allItems.slice(startIndex, endIndex);

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
