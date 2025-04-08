import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    mealPlanId: string;
  }>;
}

// 특정 식단 정보 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, mealPlanId } = await context.params;
    
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
    
    // 식단 계획 조회
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .select('*, menus(name)')
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .single();
    
    if (mealPlanError) {
      console.error('식단 계획 조회 오류:', mealPlanError);
      return NextResponse.json({ error: '식단 계획 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!mealPlan) {
      return NextResponse.json({ error: '해당 식단 계획을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    const formattedMealPlan = {
      id: mealPlan.id,
      date: mealPlan.date,
      meal_time: mealPlan.meal_time,
      menu_id: mealPlan.menu_id,
      menu_name: mealPlan.menus?.name,
      quantity: mealPlan.quantity,
      note: mealPlan.note,
    };
    
    return NextResponse.json(formattedMealPlan);
  } catch (error) {
    console.error('식단 계획 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식단 계획 수정
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, mealPlanId } = await context.params;
    
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
    
    // 해당 식단 계획이 존재하는지 확인
    const { data: existingMealPlan, error: existingMealPlanError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .single();
    
    if (existingMealPlanError) {
      console.error('식단 계획 조회 오류:', existingMealPlanError);
      return NextResponse.json({ error: '식단 계획 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!existingMealPlan) {
      return NextResponse.json({ error: '해당 식단 계획을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 식단 계획 수정
    const { data: updatedMealPlan, error: updateError } = await supabase
      .from('meal_plans')
      .update({
        date,
        meal_time,
        menu_id,
        quantity,
        note,
        updated_at: new Date().toISOString()
      })
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('식단 계획 수정 오류:', updateError);
      return NextResponse.json({ error: '식단 계획 수정 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(updatedMealPlan);
  } catch (error) {
    console.error('식단 계획 수정 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식단 계획 삭제
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, mealPlanId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
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
    
    // 식단 계획 삭제
    const { error: deleteError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId)
      .eq('company_id', companyId);
    
    if (deleteError) {
      console.error('식단 계획 삭제 오류:', deleteError);
      return NextResponse.json({ error: '식단 계획 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('식단 계획 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 