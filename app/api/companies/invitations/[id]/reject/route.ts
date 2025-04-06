import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RejectInvitationParams {
  params: {
    id: string;
  };
}

export async function POST(req: Request, { params }: RejectInvitationParams) {
  try {
    // params를 await 처리
    const paramsData = await params;
    const invitationId = paramsData.id;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 초대장 정보 가져오기
    const { data: invitation, error: invitationError } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();
    
    if (invitationError || !invitation) {
      return NextResponse.json({ error: '존재하지 않는 초대입니다.' }, { status: 404 });
    }
    
    // 초대 대상자와 현재 사용자가 일치하는지 확인
    if (invitation.invited_user_id !== userId) {
      return NextResponse.json({ error: '초대 거절 권한이 없습니다.' }, { status: 403 });
    }
    
    // 이미 처리된 초대인지 확인
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 초대입니다.' }, { status: 400 });
    }
    
    // 초대 상태 업데이트 (updated_at 필드 제거)
    const { error: updateError } = await supabase
      .from('company_invitations')
      .update({ status: 'rejected' })
      .eq('id', invitationId);
    
    if (updateError) {
      console.error('초대 상태 업데이트 오류:', updateError);
      return NextResponse.json({ error: '초대 거절 처리에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ message: '초대가 성공적으로 거절되었습니다.' });
  } catch (error) {
    console.error('초대 거절 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 