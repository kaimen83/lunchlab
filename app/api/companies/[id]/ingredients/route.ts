import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사의 식재료 목록 조회
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
    
    // 식재료 목록 조회
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    
    if (ingredientsError) {
      console.error('식재료 조회 오류:', ingredientsError);
      return NextResponse.json({ error: '식재료 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(ingredients || []);
  } catch (error) {
    console.error('식재료 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 추가
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, packageAmount, unit, price, memo1, memo2 } = body;
    
    // 필수 입력값 검증
    if (!name || !packageAmount || !unit || !price) {
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
    
    // 식재료 추가
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .insert({
        company_id: companyId,
        name,
        package_amount: packageAmount,
        unit,
        price,
        memo1,
        memo2
      })
      .select()
      .single();
    
    if (ingredientError) {
      console.error('식재료 추가 오류:', ingredientError);
      return NextResponse.json({ error: '식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 처음 추가된 식재료는 자동으로 가격 이력에 기록
    const { error: priceHistoryError } = await supabase
      .from('ingredient_price_history')
      .insert({
        ingredient_id: ingredient.id,
        price
      });
    
    if (priceHistoryError) {
      console.error('가격 이력 추가 오류:', priceHistoryError);
      // 이력 추가 실패는 치명적이지 않으므로 무시하고 진행
    }
    
    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('식재료 추가 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 