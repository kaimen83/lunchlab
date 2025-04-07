import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { ModuleSubscriptionStatus } from '@/lib/types';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 회사-모듈 구독 상태 변경 API
 * POST /api/companies/:id/modules/:moduleId/set-status
 * body: { status: 'active' | 'suspended' | 'cancelled' }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: companyId, moduleId } = params;
    
    // 요청 바디에서 새 상태 가져오기
    const { status } = await request.json() as { status: ModuleSubscriptionStatus };
    
    // 상태 유효성 검사
    if (!status || !['active', 'suspended', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 });
    }
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 모듈 상태 변경 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ error: '모듈 구독 상태 변경 권한이 없습니다.' }, { status: 403 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 현재 구독 상태 확인
    const { data: subscription, error: getError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (getError) {
      console.error('구독 정보 조회 오류:', getError);
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (!subscription) {
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 동일한 상태로 변경하려는 경우
    if (subscription.status === status) {
      return NextResponse.json({ 
        success: true, 
        message: '이미 해당 상태입니다.' 
      });
    }
    
    // 구독 상태 업데이트
    const { data, error: updateError } = await supabase
      .from('company_modules')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('구독 상태 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '구독 상태 변경 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 상태에 따른 응답 메시지
    const statusMessages: Record<ModuleSubscriptionStatus, string> = {
      active: '모듈이 활성화되었습니다.',
      suspended: '모듈이 일시 중지되었습니다.',
      cancelled: '모듈 구독이 취소되었습니다.',
      pending: '모듈 구독 승인 대기 중입니다.'
    };
    
    return NextResponse.json({ 
      subscription: data,
      success: true, 
      message: statusMessages[status] 
    });
  } catch (error) {
    console.error('모듈 구독 상태 변경 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 