import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { NextRequest } from 'next/server';
import { updateMenuContainersForIngredient } from '@/app/lib/ingredient-price-utils';

interface RouteContext {
  params: Promise<{
    id: string;
    ingredientId: string;
  }>;
}

/**
 * 특정 식재료의 상세 정보를 조회하는 API
 * 아코디언 확장 시 필요한 추가 정보를 로드할 때 사용
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId, ingredientId } = await context.params;
    const session = await auth();
    
    if (!session || !session.userId) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const userId = session.userId;

    // 회사 정보 조회
    const company = await getServerCompany(companyId);
    if (!company) {
      return Response.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 멤버십 확인
    const membership = await getUserMembership({ userId, companyId });
    if (!membership) {
      return Response.json({ error: '이 회사에 접근할 권한이 없습니다.' }, { status: 403 });
    }

    // 기능 활성화 확인
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 특정 식재료의 상세 정보 조회
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('식재료 상세 정보 조회 오류:', error);
      
      if (error.code === 'PGRST116') {
        return Response.json({ error: '식재료를 찾을 수 없습니다.' }, { status: 404 });
      }
      
      return Response.json({ error: '식재료 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(ingredient);
  } catch (error) {
    console.error('식재료 상세 정보 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
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
    console.log('받은 데이터:', body); // 디버깅용 로그 추가
    
    const { 
      name, code_name, package_amount, unit, price, 
      items_per_box, stock_grade, memo1, memo2, supplier, supplier_id,
      origin, calories, protein, fat, carbs, allergens, pac_count
    } = body;
    
    // 필수 입력값 검증 - 더 관대하게 수정
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '식재료 이름은 필수 입력 항목입니다.' }, 
        { status: 400 }
      );
    }
    
    // 숫자 필드들의 기본값 설정
    const validatedData = {
      name: name.trim(),
      code_name: code_name || null,
      supplier: supplier || null,
      supplier_id: supplier_id || null,
      package_amount: package_amount || 1,
      unit: unit || 'kg',
      price: price || 0,
      items_per_box: items_per_box || null,
      pac_count: pac_count || null,
      stock_grade: stock_grade || null,
      memo1: memo1 || null,
      memo2: memo2 || null,
      origin: origin || null,
      calories: calories || null,
      protein: protein || null,
      fat: fat || null,
      carbs: carbs || null,
      allergens: allergens || null,
    };
    
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
      .select('price, package_amount')
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
        ...validatedData,
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
    
    // 가격이 실제로 변경된 경우에만 가격 이력 추가
    if (currentIngredient && currentIngredient.price !== validatedData.price) {
      const { error: historyError } = await supabase
        .from('ingredient_price_history')
        .insert({
          ingredient_id: ingredientId,
          price: validatedData.price,
          recorded_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('가격 이력 추가 오류:', historyError);
        // 이력 추가 실패는 심각한 오류가 아니므로 계속 진행
      } else {
        console.log(`가격 변경 이력 추가: ${currentIngredient.price} → ${validatedData.price}`);
      }
    }
    
    // 가격이 변경된 경우 관련 메뉴 컨테이너 원가 업데이트
    let costUpdateResult = null;
    if (currentIngredient && currentIngredient.price !== validatedData.price) {
      try {
        costUpdateResult = await updateMenuContainersForIngredient(
          ingredientId,
          currentIngredient.price,
          validatedData.price,
          validatedData.package_amount
        );
        
        console.log(`식재료 가격 변경으로 인한 원가 업데이트 결과:`, costUpdateResult);
      } catch (updateError) {
        console.error('메뉴 컨테이너 원가 업데이트 오류:', updateError);
        // 원가 업데이트 실패는 식재료 업데이트 자체의 실패로 간주하지 않음
      }
    }
    
    return NextResponse.json({
      ...updatedIngredient,
      cost_update: costUpdateResult
    });
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