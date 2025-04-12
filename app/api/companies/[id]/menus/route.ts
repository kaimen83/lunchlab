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

    // 각 메뉴의 용기 및 용기별 원가 정보 조회
    const menusWithContainers = await Promise.all(
      (menus || []).map(async (menu) => {
        // 메뉴의 용기 정보 조회
        const { data: menuContainers, error: containersError } = await supabase
          .from('menu_containers')
          .select(`
            id,
            container:container_id (
              id, 
              name, 
              description, 
              category,
              price
            )
          `)
          .eq('menu_id', menu.id);

        if (containersError) {
          console.error('메뉴 용기 조회 오류:', containersError);
          return { ...menu, containers: [] };
        }

        // 각 용기별 식재료와 원가 계산
        const containers = await Promise.all(
          (menuContainers || []).map(async (menuContainer) => {
            // 용기에 포함된 식재료 조회
            const { data: ingredients, error: ingredientsError } = await supabase
              .from('menu_container_ingredients')
              .select(`
                id,
                ingredient_id,
                amount,
                ingredient:ingredient_id (
                  id,
                  name,
                  package_amount,
                  unit,
                  price
                )
              `)
              .eq('menu_container_id', menuContainer.id);

            if (ingredientsError) {
              console.error('용기 식재료 조회 오류:', ingredientsError);
              return {
                ...menuContainer,
                ingredients: [],
                ingredients_cost: 0,
                total_cost: menuContainer.container.price || 0
              };
            }

            // 용기 식재료 원가 계산
            const ingredientsCost = (ingredients || []).reduce((total, item) => {
              if (!item.ingredient) return total;
              const unitPrice = item.ingredient.price / item.ingredient.package_amount;
              return total + (unitPrice * item.amount);
            }, 0);

            // 용기 자체 가격 + 식재료 원가
            const containerPrice = menuContainer.container.price || 0;
            const totalCost = containerPrice + ingredientsCost;

            return {
              ...menuContainer,
              ingredients: ingredients || [],
              ingredients_cost: ingredientsCost,
              total_cost: totalCost
            };
          })
        );

        return {
          ...menu,
          containers
        };
      })
    );
    
    return NextResponse.json(menusWithContainers || []);
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
    const { name, description, recipe, ingredients, containers, code } = body;
    
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
    
    // 코드가 제공된 경우 중복 확인
    if (code) {
      const { data: existingMenu, error: codeCheckError } = await supabase
        .from('menus')
        .select('id')
        .eq('company_id', companyId)
        .eq('code', code)
        .maybeSingle();
      
      if (codeCheckError) {
        console.error('코드 중복 확인 오류:', codeCheckError);
        return NextResponse.json({ error: '코드 중복 확인 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      if (existingMenu) {
        return NextResponse.json({ error: '이미 사용 중인 메뉴 코드입니다. 다른 코드를 사용해 주세요.' }, { status: 400 });
      }
    }
    
    // 트랜잭션 시작 - 트리거를 우회하기 위해 RPC 호출을 하지 않고 직접 처리
    // 1. 메뉴 생성
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .insert({
        company_id: companyId,
        name,
        description,
        recipe,
        code, // 코드 필드 추가
        cost_price: 0 // 초기값 설정, 나중에 업데이트
      })
      .select()
      .single();
    
    if (menuError) {
      console.error('메뉴 생성 오류:', menuError);
      return NextResponse.json({ error: '메뉴 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 컨테이너 처리 및 원가 계산을 먼저 수행
    let totalCost = 0;
    
    // 컨테이너 연결 및 컨테이너별 식재료 설정
    for (const container of containers) {
      // 메뉴-컨테이너 연결
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
      
      // 컨테이너별 식재료 양 설정
      if (container.ingredients && Array.isArray(container.ingredients)) {
        // 원가 계산을 위해 식재료 정보 조회
        for (const ing of container.ingredients) {
          const { data: ingredientData } = await supabase
            .from('ingredients')
            .select('price, package_amount')
            .eq('id', ing.ingredient_id)
            .single();
          
          if (ingredientData) {
            // 원가 계산에 추가
            totalCost += (ing.amount * ingredientData.price / ingredientData.package_amount);
          }
          
          // 컨테이너 식재료 추가
          const { error: containerIngredientError } = await supabase
            .from('menu_container_ingredients')
            .insert({
              menu_container_id: menuContainer.id,
              ingredient_id: ing.ingredient_id,
              amount: ing.amount 
            });
            
          if (containerIngredientError) {
            console.error('컨테이너 식재료 추가 오류:', containerIngredientError);
          }
        }
      }
    }
    
    // 먼저 원가를 계산한 후 기본 식재료 목록 추가
    // 트리거를 피하기 위해 트랜잭션 혹은 rpc 호출 없이 직접 SQL로 처리
    // 2. 메뉴 원가 업데이트
    const { data: updatedMenu, error: updateError } = await supabase
      .from('menus')
      .update({ 
        cost_price: Math.round(totalCost),
        updated_at: new Date().toISOString()
      })
      .eq('id', menu.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('메뉴 원가 업데이트 오류:', updateError);
      return NextResponse.json({ error: '메뉴 원가 계산 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 식재료 연결 (기본 식재료 목록) - 트리거가 동작하지 않도록 원가 계산 이후에 처리
    for (const ingredient of ingredients) {
      const { error: ingredientError } = await supabase
        .from('menu_ingredients')
        .insert({
          menu_id: menu.id,
          ingredient_id: ingredient.id,
          amount: 0 // 기본 값은 0, 용기별로 양이 지정됨
        });
      
      if (ingredientError) {
        console.error('식재료 추가 오류:', ingredientError);
        // 오류가 있더라도 모든 식재료를 시도해 봅니다.
      }
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