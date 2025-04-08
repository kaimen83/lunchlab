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
    const { name, description, sellingPrice, ingredients } = body;
    
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
        selling_price: sellingPrice
      })
      .select()
      .single();
    
    if (menuError) {
      console.error('메뉴 생성 오류:', menuError);
      return NextResponse.json({ error: '메뉴 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 2. 식재료 연결
    const menuIngredients = ingredients.map(ingredient => ({
      menu_id: menu.id,
      ingredient_id: ingredient.id,
      amount_per_person: ingredient.amountPerPerson
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
    
    // 3. 업데이트된 메뉴 정보 조회 (원가가 계산된)
    const { data: updatedMenu, error: updatedMenuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menu.id)
      .single();
    
    if (updatedMenuError) {
      console.error('업데이트된 메뉴 조회 오류:', updatedMenuError);
      return NextResponse.json({ error: '메뉴 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 4. 메뉴 가격 이력 기록
    const { error: priceHistoryError } = await supabase
      .from('menu_price_history')
      .insert({
        menu_id: menu.id,
        cost_price: updatedMenu.cost_price,
        selling_price: updatedMenu.selling_price
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