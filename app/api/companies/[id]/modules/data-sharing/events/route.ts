import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { publishEvent, getUnprocessedEvents } from '@/lib/marketplace/events';

/**
 * 모듈 이벤트를 발행하는 API
 * POST /api/companies/:id/modules/data-sharing/events
 * body: {
 *   moduleId: string,
 *   eventType: string,
 *   dataId?: string,
 *   dataType?: string,
 *   eventData?: object,
 *   invalidateDataSchemaId?: string
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
    
    // 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    // 요청 데이터 파싱
    const {
      moduleId,
      eventType,
      dataId,
      dataType,
      eventData,
      invalidateDataSchemaId
    } = await request.json();
    
    // 데이터 검증
    if (!moduleId || !eventType) {
      return NextResponse.json(
        { error: '모듈 ID와 이벤트 타입은 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 이벤트 발행
    const { success, event, error } = await publishEvent(
      companyId,
      moduleId,
      eventType,
      dataId,
      dataType,
      eventData,
      invalidateDataSchemaId
    );
    
    if (error || !success) {
      console.error('이벤트 발행 오류:', error);
      return NextResponse.json(
        { error: error || '이벤트 발행 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      event: {
        id: event.id,
        eventType: event.event_type,
        createdAt: event.created_at
      },
      message: '이벤트가 성공적으로 발행되었습니다.'
    });
  } catch (error) {
    console.error('이벤트 발행 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 미처리 이벤트 목록을 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/events?moduleId=xxx&limit=50
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
    const limitParam = searchParams.get('limit');
    
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    
    // 미처리 이벤트 목록 조회
    const { events, error } = await getUnprocessedEvents(
      companyId,
      moduleId || undefined,
      limit
    );
    
    if (error) {
      console.error('미처리 이벤트 조회 오류:', error);
      return NextResponse.json(
        { error: '미처리 이벤트 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('미처리 이벤트 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 