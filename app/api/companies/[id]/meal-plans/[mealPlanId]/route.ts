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
    
    // 현재는 더미 데이터 반환
    return NextResponse.json({
      data: {
        id: mealPlanId,
        company_id: companyId,
        date: "2023-08-01",
        meal_time: "lunch",
        menu_id: "menu-123",
        menu_name: "비빔밥",
        quantity: 50,
        created_at: "2023-08-01T00:00:00Z"
      }
    });
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
    
    // 요청 바디에서 업데이트할 정보 추출
    const requestData = await request.json();
    const { date, meal_time, menu_id, quantity } = requestData;
    
    // 현재는 더미 응답 반환
    return NextResponse.json({
      data: {
        id: mealPlanId,
        company_id: companyId,
        date: date || "2023-08-01",
        meal_time: meal_time || "lunch",
        menu_id: menu_id || "menu-123",
        menu_name: "비빔밥", // 실제로는 menu_id로 조회한 정보
        quantity: quantity || 50,
        updated_at: new Date().toISOString()
      }
    });
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
    
    // 현재는 성공 응답만 반환
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