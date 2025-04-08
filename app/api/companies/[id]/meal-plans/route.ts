import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 식단 계획 목록 조회
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
    
    // 식단 계획 목록 조회
    const { data: mealPlans, error: mealPlansError } = await supabase
      .from('meal_plans')
      .select('*, menus(name)')
      .eq('company_id', companyId)
      .order('date', { ascending: true });
    
    if (mealPlansError) {
      console.error('식단 계획 조회 오류:', mealPlansError);
      return NextResponse.json({ error: '식단 계획 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 메뉴 이름 포함된 형태로 변환
    const formattedMealPlans = mealPlans.map(plan => ({
      id: plan.id,
      date: plan.date,
      meal_time: plan.meal_time,
      menu_id: plan.menu_id,
      menu_name: plan.menus?.name,
      quantity: plan.quantity,
      note: plan.note,
    }));
    
    return NextResponse.json(formattedMealPlans || []);
  } catch (error) {
    console.error('식단 계획 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식단 계획 추가
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { date, meal_time, menu_id, quantity, note } = body;
    
    // 필수 입력값 검증
    if (!date || !meal_time || !menu_id || !quantity) {
      return NextResponse.json(
        { error: '날짜, 식사 시간, 메뉴, 수량은 필수 입력 항목입니다.' }, 
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
    
    // 식단 계획 추가
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .insert({
        company_id: companyId,
        date,
        meal_time,
        menu_id,
        quantity,
        note
      })
      .select()
      .single();
    
    if (mealPlanError) {
      console.error('식단 계획 추가 오류:', mealPlanError);
      return NextResponse.json({ error: '식단 계획 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error('식단 계획 추가 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 