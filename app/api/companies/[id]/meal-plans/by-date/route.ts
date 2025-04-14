import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Route Context 타입 정의 (Next.js 15 스타일)
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET: 특정 날짜의 식단 목록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: '날짜 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // 해당 날짜의 식단 목록 조회
    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        meal_plan_menus(
          *,
          menu:menus(
            id,
            name,
            description,
            menu_price_history(cost_price, recorded_at),
            menu_containers(
              id,
              menu_id,
              container_id,
              ingredients_cost
            )
          ),
          container:containers(
            id,
            name,
            description,
            price
          )
        )
      `)
      .eq('company_id', companyId)
      .eq('date', date)
      .order('meal_time');
    
    if (error) {
      console.error('식단 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '식단 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(mealPlans || []);
    
  } catch (error) {
    console.error('식단 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '식단 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 