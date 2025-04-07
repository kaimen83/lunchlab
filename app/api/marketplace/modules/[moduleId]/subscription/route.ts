import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getModuleSubscriptionsByModuleId } from '@/lib/marketplace/queries';

interface RouteContext {
  params: Promise<{
    moduleId: string;
  }>;
}

/**
 * 특정 마켓플레이스 모듈의 구독 정보를 조회하는 API
 * GET /api/marketplace/modules/[moduleId]/subscription
 * 
 * 참고: 관리자만 접근 가능
 */
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { moduleId } = await context.params;
    
    if (!moduleId) {
      return NextResponse.json({ error: '모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 관리자 권한 확인
    const supabase = createServerSupabaseClient();
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (adminError) {
      console.error('관리자 확인 오류:', adminError);
      return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: '이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다.' }, { status: 403 });
    }
    
    // 모듈 구독 정보 조회
    const { subscriptions, error } = await getModuleSubscriptionsByModuleId(moduleId);
    
    if (error) {
      console.error('모듈 구독 조회 오류:', error);
      return NextResponse.json({ error: '모듈 구독 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('모듈 구독 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 