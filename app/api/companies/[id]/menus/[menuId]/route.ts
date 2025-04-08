import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

// 특정 메뉴 조회
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
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 및 메뉴 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 메뉴 정보 조회
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .eq('company_id', companyId)
      .single();
    
    if (menuError) {
      console.error('메뉴 조회 오류:', menuError);
      return NextResponse.json({ error: '메뉴 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 메뉴의 식재료 목록 조회
    const { data: menuIngredients, error: ingredientsError } = await supabase
      .from('menu_ingredients')
      .select(`
        id,
        amount_per_person,
        ingredient:ingredients (
          id,
          name,
          unit,
          price,
          package_amount
        )
      `)
      .eq('menu_id', menuId);
    
    if (ingredientsError) {
      console.error('메뉴 식재료 조회 오류:', ingredientsError);
      return NextResponse.json({ error: '메뉴 식재료 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 메뉴 가격 이력 조회
    const { data: priceHistory, error: historyError } = await supabase
      .from('menu_price_history')
      .select('cost_price, selling_price, recorded_at')
      .eq('menu_id', menuId)
      .order('recorded_at', { ascending: false });
    
    if (historyError) {
      console.error('가격 이력 조회 오류:', historyError);
      // 이력 조회 실패는 치명적이지 않으므로 빈 배열로 처리
    }
    
    // 응답 데이터 구성
    const responseData = {
      ...menu,
      ingredients: menuIngredients || [],
      priceHistory: priceHistory || []
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('메뉴 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 메뉴 정보 수정
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
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
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 및 메뉴 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 메뉴 업데이트 전 현재 데이터 조회 (가격 변동 확인용)
    const { data: currentMenu, error: currentError } = await supabase
      .from('menus')
      .select('cost_price, selling_price')
      .eq('id', menuId)
      .eq('company_id', companyId)
      .single();
    
    if (currentError) {
      console.error('현재 메뉴 조회 오류:', currentError);
      return NextResponse.json({ error: '메뉴 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 트랜잭션 시작
    // 1. 메뉴 정보 업데이트
    const { data: updatedMenu, error: updateError } = await supabase
      .from('menus')
      .update({
        name,
        description,
        selling_price: sellingPrice,
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
    const { error: deleteError } = await supabase
      .from('menu_ingredients')
      .delete()
      .eq('menu_id', menuId);
    
    if (deleteError) {
      console.error('메뉴 식재료 삭제 오류:', deleteError);
      return NextResponse.json({ error: '메뉴 식재료 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 3. 새로운 식재료 연결
    const menuIngredients = ingredients.map(ingredient => ({
      menu_id: menuId,
      ingredient_id: ingredient.id,
      amount_per_person: ingredient.amountPerPerson
    }));
    
    const { error: ingredientsError } = await supabase
      .from('menu_ingredients')
      .insert(menuIngredients);
    
    if (ingredientsError) {
      console.error('메뉴 식재료 추가 오류:', ingredientsError);
      return NextResponse.json({ error: '메뉴 식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 4. 최종 업데이트된 메뉴 정보 조회 (원가가 재계산된)
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
    console.error('메뉴 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 메뉴 삭제
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 관리자급 이상인지 확인
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
    
    if (!membershipData || !['owner', 'admin'].includes(membershipData.role)) {
      return NextResponse.json({ error: '메뉴를 삭제할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 및 메뉴 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 메뉴 삭제 (관계된 식재료 연결과 가격 이력은 CASCADE로 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId)
      .eq('company_id', companyId);
    
    if (deleteError) {
      console.error('메뉴 삭제 오류:', deleteError);
      return NextResponse.json({ error: '메뉴 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '메뉴가 삭제되었습니다.' });
  } catch (error) {
    console.error('메뉴 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 