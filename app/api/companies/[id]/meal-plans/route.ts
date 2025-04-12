import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET: 식단 목록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 쿼리 파라미터에서 날짜 범위 가져오기
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    let query = supabase
      .from('meal_plans')
      .select(`
        *,
        meal_plan_menus(
          *,
          menu:menus(
            id,
            name,
            description,
            cost_price
          )
        )
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: true })
      .order('meal_time', { ascending: true });
    
    // 날짜 범위가 제공된 경우 필터링 추가
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('식단 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '식단 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('식단 목록 가져오기 오류:', error);
    return NextResponse.json(
      { error: '식단 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 식단 추가
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 요청 본문에서 데이터 추출
    const { name, date, meal_time, menu_ids } = await request.json();
    
    // 필수 필드 확인
    if (!name || !date || !meal_time || !menu_ids || !Array.isArray(menu_ids) || menu_ids.length === 0) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (name, date, meal_time, menu_ids)' },
        { status: 400 }
      );
    }
    
    // 트랜잭션을 사용하여 식단 및 관련 메뉴 추가
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .insert({
        company_id: companyId,
        name,
        date,
        meal_time
      })
      .select()
      .single();
    
    if (mealPlanError) {
      console.error('식단 추가 오류:', mealPlanError);
      return NextResponse.json(
        { error: '식단을 추가하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 메뉴 연결 데이터 생성
    const menuLinks = menu_ids.map(menuId => ({
      meal_plan_id: mealPlan.id,
      menu_id: menuId
    }));
    
    // 메뉴 연결 추가
    const { error: menuLinkError } = await supabase
      .from('meal_plan_menus')
      .insert(menuLinks);
    
    if (menuLinkError) {
      console.error('식단-메뉴 연결 오류:', menuLinkError);
      // 롤백을 위해 생성된 식단 삭제
      await supabase.from('meal_plans').delete().eq('id', mealPlan.id);
      
      return NextResponse.json(
        { error: '식단-메뉴 연결 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 완성된 식단 정보 조회
    const { data: completeMealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select(`
        *,
        meal_plan_menus(
          *,
          menu:menus(
            id,
            name,
            description,
            cost_price
          )
        )
      `)
      .eq('id', mealPlan.id)
      .single();
    
    if (fetchError) {
      console.error('완성된 식단 조회 오류:', fetchError);
      return NextResponse.json(
        { error: '완성된 식단 정보를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(completeMealPlan);
  } catch (error) {
    console.error('식단 추가 오류:', error);
    return NextResponse.json(
      { error: '식단을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 