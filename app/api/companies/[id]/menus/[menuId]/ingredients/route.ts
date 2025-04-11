import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

// 메뉴의 식재료 목록 조회
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
    
    // 메뉴가 해당 회사에 속하는지 확인
    const { data: menuData, error: menuError } = await supabase
      .from('menus')
      .select('id')
      .eq('id', menuId)
      .eq('company_id', companyId)
      .single();
    
    if (menuError) {
      console.error('메뉴 확인 오류:', menuError);
      return NextResponse.json({ error: '메뉴 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 메뉴 식재료 목록 조회
    const { data: menuIngredients, error: ingredientsError } = await supabase
      .from('menu_ingredients')
      .select('id, menu_id, ingredient_id, amount, ingredient:ingredients(id, name, package_amount, unit, price, memo1, memo2)')
      .eq('menu_id', menuId);
    
    if (ingredientsError) {
      console.error('메뉴 식재료 조회 오류:', ingredientsError);
      return NextResponse.json({ error: '메뉴 식재료 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(menuIngredients || []);
  } catch (error) {
    console.error('메뉴 식재료 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 