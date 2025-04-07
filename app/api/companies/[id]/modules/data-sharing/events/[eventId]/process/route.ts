import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { markEventAsProcessed } from '@/lib/marketplace/events';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 이벤트 처리 완료 표시 API
 * POST /api/companies/:id/modules/data-sharing/events/:eventId/process
 * body: { moduleId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; eventId: string } }
) {
  try {
    const { id: companyId, eventId } = params;
    
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
    
    // 요청 데이터 파싱
    const { moduleId } = await request.json();
    
    // 데이터 검증
    if (!moduleId) {
      return NextResponse.json(
        { error: '모듈 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 이벤트가 존재하고 해당 회사에 속하는지 확인
    const supabase = createServerSupabaseClient();
    const { data: event, error: eventError } = await supabase
      .from('module_events')
      .select('id, processed')
      .eq('id', eventId)
      .eq('company_id', companyId)
      .single();
    
    if (eventError || !event) {
      return NextResponse.json(
        { error: '해당 이벤트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    if (event.processed) {
      return NextResponse.json(
        { error: '이미 처리된 이벤트입니다.' },
        { status: 400 }
      );
    }
    
    // 이벤트에 대한 구독 여부 확인
    const { data: subscription, error: subError } = await supabase
      .from('module_event_subscriptions')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (subError) {
      console.error('구독 확인 오류:', subError);
      return NextResponse.json(
        { error: '구독 정보 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 구독 없이 이벤트를 처리하려는 경우
    if (!subscription) {
      return NextResponse.json(
        { error: '해당 모듈은 이벤트에 대한 구독 정보가 없습니다.' },
        { status: 403 }
      );
    }
    
    // 이벤트 처리 완료 표시
    const { success, error } = await markEventAsProcessed(eventId);
    
    if (error || !success) {
      console.error('이벤트 처리 완료 표시 오류:', error);
      return NextResponse.json(
        { error: '이벤트 처리 완료 표시 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '이벤트가 처리 완료로 표시되었습니다.'
    });
  } catch (error) {
    console.error('이벤트 처리 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 