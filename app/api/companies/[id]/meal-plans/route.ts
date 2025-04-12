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
    const { id } = await context.params;
    
    // 현재는 빈 배열 반환
    return NextResponse.json({ data: [] });
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
    const { id } = await context.params;
    
    // 더미 응답 반환
    return NextResponse.json({
      data: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        company_id: id,
        date: "2023-08-01",
        meal_time: "lunch",
        quantity: 50
      }
    });
  } catch (error) {
    console.error('식단 추가 오류:', error);
    return NextResponse.json(
      { error: '식단을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 