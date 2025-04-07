import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { 
  subscribeToEvent, 
  unsubscribeFromEvent, 
  getModuleEventSubscriptions 
} from '@/lib/marketplace/events';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 이벤트 구독 목록을 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/subscriptions?moduleId=xxx&eventType=xxx
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const eventType = searchParams.get('eventType');
    
    let subscriptions = [];
    
    // 데이터베이스 클라이언트 생성
    const supabase = createServerSupabaseClient();
    
    // 조회 쿼리 구성
    let query = supabase
      .from('module_event_subscriptions')
      .select(`
        *,
        module:module_id (
          id,
          name
        )
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }
    
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('이벤트 구독 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '이벤트 구독 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ subscriptions: data || [] });
  } catch (error) {
    console.error('이벤트 구독 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 이벤트 구독을 생성하는 API
 * POST /api/companies/:id/modules/data-sharing/subscriptions
 * body: {
 *   moduleId: string,
 *   eventType: string,
 *   callbackUrl?: string
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 구독 생성 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: '이벤트 구독 생성 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 요청 데이터 파싱
    const { moduleId, eventType, callbackUrl } = await request.json();
    
    // 데이터 검증
    if (!moduleId || !eventType) {
      return NextResponse.json(
        { error: '모듈 ID와 이벤트 타입은 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 구독 생성
    const { subscription, error } = await subscribeToEvent(
      companyId,
      moduleId,
      eventType,
      callbackUrl
    );
    
    if (error) {
      // 이미 구독 중인 경우 409 상태 코드 반환
      if (error.includes('이미 구독 중인 이벤트')) {
        return NextResponse.json(
          { error },
          { status: 409 }
        );
      }
      
      console.error('이벤트 구독 생성 오류:', error);
      return NextResponse.json(
        { error: '이벤트 구독 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      subscription,
      message: '이벤트 구독이 생성되었습니다.'
    });
  } catch (error) {
    console.error('이벤트 구독 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 이벤트 구독을 취소하는 API
 * DELETE /api/companies/:id/modules/data-sharing/subscriptions?moduleId=xxx&eventType=xxx
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 구독 취소 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: '이벤트 구독 취소 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const eventType = searchParams.get('eventType');
    
    if (!moduleId || !eventType) {
      return NextResponse.json(
        { error: '모듈 ID와 이벤트 타입은 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 구독 취소
    const { success, error } = await unsubscribeFromEvent(
      companyId,
      moduleId,
      eventType
    );
    
    if (error || !success) {
      console.error('이벤트 구독 취소 오류:', error);
      return NextResponse.json(
        { error: '이벤트 구독 취소 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '이벤트 구독이 취소되었습니다.'
    });
  } catch (error) {
    console.error('이벤트 구독 취소 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 