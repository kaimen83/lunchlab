import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// Next.js 15에서 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: requestId } = await context.params;
    
    if (!requestId) {
      return NextResponse.json({ error: '가입 신청 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 가입 신청 정보 조회
    const { data: joinRequest, error: requestError } = await supabase
      .from('company_join_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();
    
    if (requestError || !joinRequest) {
      return NextResponse.json({ error: '유효한 가입 신청을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 요청자가 회사의 관리자 또는 소유자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', joinRequest.company_id)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사의 가입 신청을 관리할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 관리자나 소유자만 가입 신청을 거절할 수 있음
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: '가입 신청 관리 권한이 없습니다.' }, { status: 403 });
    }
    
    // 가입 신청 상태를 거절로 업데이트
    const { error: updateError } = await supabase
      .from('company_join_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (updateError) {
      return NextResponse.json({ error: '가입 신청 상태 업데이트에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '가입 신청이 성공적으로 거절되었습니다.'
    });
  } catch (error) {
    console.error('가입 신청 거절 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 