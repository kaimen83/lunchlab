import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    ingredientId: string;
  }>;
}

// 특정 식재료 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, ingredientId } = await context.params;
    
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
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 식재료 정보 조회
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .single();
    
    if (ingredientError) {
      console.error('식재료 조회 오류:', ingredientError);
      return NextResponse.json({ error: '식재료 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 해당 식재료의 가격 이력 조회
    const { data: priceHistory, error: historyError } = await supabase
      .from('ingredient_price_history')
      .select('price, recorded_at')
      .eq('ingredient_id', ingredientId)
      .order('recorded_at', { ascending: false });
    
    if (historyError) {
      console.error('가격 이력 조회 오류:', historyError);
      // 이력 조회 실패는 치명적이지 않으므로 빈 배열로 처리
    }
    
    // 응답 데이터 구성
    const responseData = {
      ...ingredient,
      priceHistory: priceHistory || []
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('식재료 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 정보 수정
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, ingredientId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, code_name, package_amount, unit, price, items_per_box, stock_grade, memo1, supplier_id } = body;
    
    // 필수 입력값 검증
    if (!name || !package_amount || !unit || !price) {
      return NextResponse.json(
        { error: '이름, 포장량, 단위, 가격은 필수 입력 항목입니다.' }, 
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
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 식재료 업데이트 전 현재 데이터 조회 (가격 변동 확인용)
    const { data: currentIngredient, error: currentError } = await supabase
      .from('ingredients')
      .select('price')
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .single();
    
    if (currentError) {
      console.error('현재 식재료 조회 오류:', currentError);
      return NextResponse.json({ error: '식재료 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 식재료 정보 업데이트
    const { data: updatedIngredient, error: updateError } = await supabase
      .from('ingredients')
      .update({
        name,
        code_name: code_name || null,
        supplier_id: supplier_id || null,
        package_amount,
        unit,
        price,
        items_per_box: items_per_box || null,
        stock_grade: stock_grade || null,
        memo1: memo1 || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('식재료 업데이트 오류:', updateError);
      return NextResponse.json({ error: '식재료 정보 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(updatedIngredient);
  } catch (error) {
    console.error('식재료 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 삭제
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, ingredientId } = await context.params;
    
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
      return NextResponse.json({ error: '식재료를 삭제할 권한이 없습니다.' }, { status: 403 });
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
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 이 식재료가 사용되는 메뉴가 있는지 확인
    const { data: menuIngredients, error: menuIngredientsError } = await supabase
      .from('menu_ingredients')
      .select('menu_id')
      .eq('ingredient_id', ingredientId);
    
    if (menuIngredientsError) {
      console.error('메뉴 식재료 조회 오류:', menuIngredientsError);
      return NextResponse.json({ error: '식재료 사용 여부 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (menuIngredients && menuIngredients.length > 0) {
      return NextResponse.json({ 
        error: '이 식재료는 하나 이상의 메뉴에서 사용 중이므로 삭제할 수 없습니다.',
        menuIds: menuIngredients.map(item => item.menu_id)
      }, { status: 400 });
    }
    
    // 식재료 삭제
    const { error: deleteError } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', ingredientId)
      .eq('company_id', companyId);
    
    if (deleteError) {
      console.error('식재료 삭제 오류:', deleteError);
      return NextResponse.json({ error: '식재료 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '식재료가 삭제되었습니다.' });
  } catch (error) {
    console.error('식재료 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 메서드 지원 추가 - PUT 핸들러를 재사용
export const PATCH = PUT; 