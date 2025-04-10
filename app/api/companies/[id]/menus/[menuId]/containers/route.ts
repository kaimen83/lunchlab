import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

// 메뉴의 컨테이너 및 컨테이너별 식재료 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
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
    
    // 메뉴 컨테이너 조회
    const { data: menuContainers, error: menuContainersError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        container:container_id (
          id,
          name,
          description,
          category
        )
      `)
      .eq('menu_id', menuId);
    
    if (menuContainersError) {
      console.error('메뉴 컨테이너 조회 오류:', menuContainersError);
      return NextResponse.json({ error: '메뉴 컨테이너 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!menuContainers || menuContainers.length === 0) {
      return NextResponse.json([]);
    }
    
    // 각 컨테이너별 식재료 정보 조회
    const result = await Promise.all(
      menuContainers.map(async (menuContainer) => {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('menu_container_ingredients')
          .select(`
            id,
            menu_container_id,
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
          console.error('컨테이너 식재료 조회 오류:', ingredientsError);
          return {
            ...menuContainer,
            ingredients: []
          };
        }
        
        return {
          ...menuContainer,
          ingredients: ingredients || []
        };
      })
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('메뉴 컨테이너 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 