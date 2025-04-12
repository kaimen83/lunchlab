import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface Menu {
  id: string;
  name: string;
  description: string | null;
}

interface Container {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface Ingredient {
  id: string;
  name: string;
  price: number;
  package_amount: number;
  unit: string;
}

// 회사별 메뉴-용기 연결 정보 조회
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
    
    // 먼저 회사의 모든 메뉴 ID 조회
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id, name, description')
      .eq('company_id', companyId);
    
    if (menusError) {
      console.error('메뉴 ID 조회 오류:', menusError);
      return NextResponse.json({ error: '메뉴 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!menus || menus.length === 0) {
      return NextResponse.json([]); // 메뉴가 없으면 빈 배열 반환
    }
    
    // 메뉴 ID 배열 추출
    const menuIds = menus.map(menu => menu.id);
    
    // 회사의 모든 메뉴-용기 연결 정보 조회
    const { data: menuContainers, error: menuContainersError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        menu_id,
        container_id,
        container:containers(id, name, description, price)
      `)
      .in('menu_id', menuIds);
    
    if (menuContainersError) {
      console.error('메뉴-용기 연결 정보 조회 오류:', menuContainersError);
      return NextResponse.json({ error: '메뉴-용기 연결 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!menuContainers || menuContainers.length === 0) {
      return NextResponse.json([]); // 메뉴-용기 연결 정보가 없으면 빈 배열 반환
    }
    
    // 각 메뉴-용기 조합에 대한 원가 계산을 위해 필요한 정보 수집
    const result = await Promise.all(
      menuContainers.map(async (menuContainer) => {
        // 메뉴 정보 조회
        const menu = menus.find(m => m.id === menuContainer.menu_id);
        
        // 해당 메뉴-용기 조합의 식재료 조회
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('menu_container_ingredients')
          .select(`
            id,
            ingredient_id,
            amount,
            ingredient:ingredients(id, name, price, package_amount, unit)
          `)
          .eq('menu_container_id', menuContainer.id);
        
        if (ingredientsError) {
          console.error('식재료 조회 오류:', ingredientsError);
          return {
            ...menuContainer,
            menu: menu || { id: menuContainer.menu_id, name: '알 수 없는 메뉴', description: null },
            ingredients: [],
            total_cost: 0
          };
        }
        
        // 식재료 원가 계산
        const ingredientsCost = (ingredients || []).reduce((total, item) => {
          if (!item.ingredient) return total;
          
          const ingredientData = item.ingredient as unknown as Ingredient;
          const unitPrice = ingredientData.price / ingredientData.package_amount;
          return total + (unitPrice * item.amount);
        }, 0);
        
        // 용기 자체 가격 - 원가에서 제외
        const containerData = menuContainer.container as unknown as Container;
        
        // 총 원가 = 식재료 원가만 포함
        const totalCost = ingredientsCost;
        
        return {
          id: menuContainer.id,
          menu_id: menuContainer.menu_id,
          container_id: menuContainer.container_id,
          menu: menu || { id: menuContainer.menu_id, name: '알 수 없는 메뉴', description: null },
          container: menuContainer.container,
          ingredients: ingredients || [],
          ingredients_cost: ingredientsCost,
          container_price: 0, // 용기 가격은 원가에 포함하지 않음
          total_cost: totalCost
        };
      })
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('메뉴-용기 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 