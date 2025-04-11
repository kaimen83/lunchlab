import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
}

interface SelectedIngredient {
  id: string;
  ingredient_id: string;
  amount: number;
}

interface ContainerIngredient {
  ingredient_id: string;
  amount: number;
}

interface Container {
  container_id: string;
  ingredients: ContainerIngredient[];
}

// 메뉴 정보 부분 수정
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, recipe, cost, ingredients, containers } = body;
    
    // 필수 입력값 검증
    if (!name) {
      return NextResponse.json(
        { error: '메뉴 이름은 필수 입력 항목입니다.' }, 
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 메뉴 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'menus')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '메뉴 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 1. 메뉴 정보 업데이트 
    const { data: updatedMenu, error: updateError } = await supabase
      .from('menus')
      .update({
        name,
        description,
        recipe,
        updated_at: new Date().toISOString()
      })
      .eq('id', menuId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('메뉴 업데이트 오류:', updateError);
      return NextResponse.json({ error: '메뉴 정보 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 2. 기존 식재료 연결 삭제
    if (ingredients && ingredients.length > 0) {
      const { error: deleteError } = await supabase
        .from('menu_ingredients')
        .delete()
        .eq('menu_id', menuId);
      
      if (deleteError) {
        console.error('메뉴 식재료 삭제 오류:', deleteError);
        return NextResponse.json({ error: '메뉴 식재료 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      // 3. 새로운 식재료 연결
      const menuIngredients = ingredients.map((ingredient: SelectedIngredient) => ({
        menu_id: menuId,
        ingredient_id: ingredient.id,
        amount: ingredient.amount
      }));
      
      const { error: ingredientsError } = await supabase
        .from('menu_ingredients')
        .insert(menuIngredients);
      
      if (ingredientsError) {
        console.error('메뉴 식재료 추가 오류:', ingredientsError);
        return NextResponse.json({ error: '메뉴 식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
      }
    }
    
    // 4. 컨테이너 처리
    if (containers && containers.length > 0) {
      // 기존 컨테이너 모두 삭제
      const { error: deleteContainerError } = await supabase
        .from('menu_containers')
        .delete()
        .eq('menu_id', menuId);
      
      if (deleteContainerError) {
        console.error('메뉴 컨테이너 삭제 오류:', deleteContainerError);
        return NextResponse.json({ error: '메뉴 컨테이너 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      // 새 컨테이너 추가
      let totalCost = 0;
      
      for (const container of containers) {
        // 컨테이너 연결
        const { data: menuContainer, error: containerError } = await supabase
          .from('menu_containers')
          .insert({
            menu_id: menuId,
            container_id: container.container_id
          })
          .select()
          .single();
        
        if (containerError) {
          console.error('메뉴 컨테이너 추가 오류:', containerError);
          continue;
        }
        
        // 컨테이너별 식재료 추가
        if (container.ingredients && Array.isArray(container.ingredients)) {
          const containerIngredients = container.ingredients.map((ing: ContainerIngredient) => ({
            menu_container_id: menuContainer.id,
            ingredient_id: ing.ingredient_id,
            amount: ing.amount
          }));
          
          const { error: containerIngredientsError } = await supabase
            .from('menu_container_ingredients')
            .insert(containerIngredients);
          
          if (containerIngredientsError) {
            console.error('컨테이너 식재료 추가 오류:', containerIngredientsError);
          }
          
          // 원가 계산을 위해 식재료 정보 조회
          for (const ing of container.ingredients as ContainerIngredient[]) {
            const { data: ingredientData } = await supabase
              .from('ingredients')
              .select('price, package_amount')
              .eq('id', ing.ingredient_id)
              .single();
            
            if (ingredientData) {
              // 원가 계산
              totalCost += (ing.amount * ingredientData.price / ingredientData.package_amount);
            }
          }
        }
      }
      
      // 원가 업데이트
      if (totalCost > 0) {
        const { data: costUpdatedMenu, error: costUpdateError } = await supabase
          .from('menus')
          .update({ cost_price: Math.round(totalCost) })
          .eq('id', menuId)
          .select()
          .single();
        
        if (costUpdateError) {
          console.error('메뉴 원가 업데이트 오류:', costUpdateError);
        } else {
          // 가격 이력 기록
          await supabase
            .from('menu_price_history')
            .insert({
              menu_id: menuId,
              cost_price: Math.round(totalCost)
            });
        }
      }
    }
    
    // 최신 메뉴 정보 조회
    const { data: finalMenu, error: finalMenuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .single();
    
    if (finalMenuError) {
      console.error('최종 메뉴 조회 오류:', finalMenuError);
      return NextResponse.json({ error: '메뉴 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(finalMenu);
  } catch (error) {
    console.error('메뉴 수정 중 오류 발생:', error);
    return NextResponse.json({ error: '메뉴 식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 