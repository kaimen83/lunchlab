import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
    mealPlanId: string;
  }>;
}

// GET: 특정 식단 정보 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, mealPlanId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 특정 식단 정보 조회
    const { data: mealPlan, error } = await supabase
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
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .order('recorded_at', { foreignTable: 'meal_plan_menus.menu.menu_price_history', ascending: false })
      .single();
    
    if (error) {
      console.error('식단 정보 조회 오류:', error);
      return NextResponse.json(
        { error: '식단 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (!mealPlan) {
      return NextResponse.json(
        { error: '해당 식단을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error('식단 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '식단 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PATCH: 식단 정보 업데이트
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, mealPlanId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 요청 바디에서 업데이트할 정보 추출
    const { name, date, meal_time, menu_selections } = await request.json();
    
    // 식단이 존재하는지 확인
    const { data: existingMealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .single();
    
    if (fetchError || !existingMealPlan) {
      return NextResponse.json(
        { error: '해당 식단을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 식단 기본 정보 업데이트
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (name) updateData.name = name;
    if (date) updateData.date = date;
    if (meal_time) updateData.meal_time = meal_time;
    
    const { error: updateError } = await supabase
      .from('meal_plans')
      .update(updateData)
      .eq('id', mealPlanId);
    
    if (updateError) {
      console.error('식단 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '식단 정보를 업데이트하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 메뉴 선택 정보가 제공된 경우, 연결된 메뉴 및 용기 업데이트
    if (menu_selections && Array.isArray(menu_selections)) {
      // 기존 메뉴 연결 삭제
      const { error: deleteError } = await supabase
        .from('meal_plan_menus')
        .delete()
        .eq('meal_plan_id', mealPlanId);
      
      if (deleteError) {
        console.error('기존 메뉴 연결 삭제 오류:', deleteError);
        return NextResponse.json(
          { error: '식단-메뉴 연결을 업데이트하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      // 새 메뉴 및 용기 연결 추가
      if (menu_selections.length > 0) {
        const menuLinks = menu_selections.map(selection => ({
          meal_plan_id: mealPlanId,
          menu_id: selection.menuId,
          container_id: selection.containerId || null
        }));
        
        const { error: insertError } = await supabase
          .from('meal_plan_menus')
          .insert(menuLinks);
        
        if (insertError) {
          console.error('새 메뉴 연결 추가 오류:', insertError);
          return NextResponse.json(
            { error: '식단-메뉴 연결을 업데이트하는 중 오류가 발생했습니다.' },
            { status: 500 }
          );
        }
      }
    }
    
    // 업데이트된 식단 정보 조회
    const { data: updatedMealPlan, error: fetchUpdatedError } = await supabase
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
      .eq('id', mealPlanId)
      .order('recorded_at', { foreignTable: 'meal_plan_menus.menu.menu_price_history', ascending: false })
      .single();
    
    if (fetchUpdatedError) {
      console.error('업데이트된 식단 조회 오류:', fetchUpdatedError);
      return NextResponse.json(
        { error: '업데이트된 식단 정보를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(updatedMealPlan);
  } catch (error) {
    console.error('식단 정보 업데이트 오류:', error);
    return NextResponse.json(
      { error: '식단 정보를 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 식단 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, mealPlanId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 식단이 존재하는지 확인
    const { data: mealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('id', mealPlanId)
      .eq('company_id', companyId)
      .single();
    
    if (fetchError || !mealPlan) {
      return NextResponse.json(
        { error: '해당 식단을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 식단 삭제 (관련 meal_plan_menus 항목은 CASCADE 제약 조건으로 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId);
    
    if (deleteError) {
      console.error('식단 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '식단을 삭제하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '식단이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('식단 삭제 오류:', error);
    return NextResponse.json(
      { error: '식단을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 