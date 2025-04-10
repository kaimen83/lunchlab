import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사의 메뉴 목록 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id')
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
    
    // 메뉴 목록 조회
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    
    if (menusError) {
      console.error('메뉴 조회 오류:', menusError);
      return NextResponse.json({ error: '메뉴 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(menus || []);
  } catch (error) {
    console.error('메뉴 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 메뉴 추가
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description, recipe, ingredients, containers } = body;
    
    // 필수 입력값 검증
    if (!name) {
      return NextResponse.json(
        { error: '메뉴 이름은 필수 입력 항목입니다.' }, 
        { status: 400 }
      );
    }
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: '메뉴는 최소 하나 이상의 식재료가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!containers || !Array.isArray(containers) || containers.length === 0) {
      return NextResponse.json(
        { error: '메뉴는 최소 하나 이상의 용기가 필요합니다.' },
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
    
    // 트랜잭션 시작
    // 1. 메뉴 생성
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert({
        company_id: companyId,
        name,
        description,
        recipe
      })
      .select()
      .single();
    
    if (menuError) {
      console.error('메뉴 생성 오류:', menuError);
      return NextResponse.json({ error: '메뉴 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 2. 식재료 연결 (기본 식재료 목록)
    const menuIngredients = ingredients.map(ingredient => ({
      menu_id: menu.id,
      ingredient_id: ingredient.id,
      amount: 0 // 기본 값은 0, 용기별로 양이 지정됨
    }));
    
    const { error: ingredientsError } = await supabase
      .from('menu_ingredients')
      .insert(menuIngredients);
    
    if (ingredientsError) {
      console.error('메뉴 식재료 추가 오류:', ingredientsError);
      
      // 롤백: 생성된 메뉴 삭제
      await supabase
        .from('menus')
        .delete()
        .eq('id', menu.id);
      
      return NextResponse.json({ error: '메뉴 식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 3. 컨테이너 연결 및 컨테이너별 식재료 설정
    let totalCost = 0;
    
    for (const container of containers) {
      // 3-1. 메뉴-컨테이너 연결
      const { data: menuContainer, error: containerError } = await supabase
        .from('menu_containers')
        .insert({
          menu_id: menu.id,
          container_id: container.container_id
        })
        .select()
        .single();
      
      if (containerError) {
        console.error('메뉴 컨테이너 추가 오류:', containerError);
        continue; // 해당 컨테이너는 건너뛰고 다음 처리
      }
      
      // 3-2. 컨테이너별 식재료 양 설정
      if (container.ingredients && Array.isArray(container.ingredients)) {
        const containerIngredients = container.ingredients.map(ing => ({
          menu_container_id: menuContainer.id,
          ingredient_id: ing.ingredient_id,
          amount: ing.amount
        }));
        
        // DB에 저장
        const { error: containerIngredientsError } = await supabase
          .from('menu_container_ingredients')
          .insert(containerIngredients);
        
        if (containerIngredientsError) {
          console.error('컨테이너 식재료 추가 오류:', containerIngredientsError);
        }
        
        // 원가 계산을 위해 식재료 정보 조회
        for (const ing of container.ingredients as { ingredient_id: string; amount: number }[]) {
          const { data: ingredientData } = await supabase
            .from('ingredients')
            .select('price, package_amount')
            .eq('id', ing.ingredient_id)
            .single();
          
          if (ingredientData) {
            // 원가 계산에 추가
            totalCost += (ing.amount * ingredientData.price / ingredientData.package_amount);
          }
        }
      }
    }
    
    // 4. 메뉴 원가 업데이트
    const { data: updatedMenu, error: updateError } = await supabase
      .from('menus')
      .update({ cost_price: Math.round(totalCost) })
      .eq('id', menu.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('메뉴 원가 업데이트 오류:', updateError);
      return NextResponse.json({ error: '메뉴 원가 계산 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 5. 메뉴 가격 이력 기록
    const { error: priceHistoryError } = await supabase
      .from('menu_price_history')
      .insert({
        menu_id: menu.id,
        cost_price: Math.round(totalCost)
      });
    
    if (priceHistoryError) {
      console.error('메뉴 가격 이력 기록 오류:', priceHistoryError);
      // 이력 추가 실패는 치명적이지 않으므로 무시하고 진행
    }
    
    return NextResponse.json(updatedMenu);
  } catch (error) {
    console.error('메뉴 추가 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 