import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface AcceptInvitationParams {
  params: {
    id: string;
  };
}

export async function POST(req: Request, { params }: AcceptInvitationParams) {
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
      return NextResponse.json({ error: '초대 수락 권한이 없습니다.' }, { status: 403 });
    }
    
    // 이미 처리된 초대인지 확인
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 초대입니다.' }, { status: 400 });
    }
    
    // 초대가 만료되었는지 확인
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('company_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);
      
      return NextResponse.json({ error: '만료된 초대입니다.' }, { status: 400 });
    }
    
    // 이미 해당 회사의 멤버인지 확인
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', invitation.company_id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipCheckError) {
      console.error('멤버십 확인 오류:', membershipCheckError);
      return NextResponse.json({ error: '멤버십 확인에 실패했습니다.' }, { status: 500 });
    }
    
    // 트랜잭션 시작 (여러 작업을 하나의 단위로 처리)
    // 1. 초대 상태 업데이트 (updated_at 필드 제거)
    const { error: updateError } = await supabase
      .from('company_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);
    
    if (updateError) {
      console.error('초대 상태 업데이트 오류:', updateError);
      return NextResponse.json({ error: '초대 수락 처리에 실패했습니다.' }, { status: 500 });
    }
    
    // 2. 회사 멤버십 생성 또는 업데이트
    let membershipError = null;
    
    if (existingMembership) {
      // 이미 멤버십이 존재하면 역할 업데이트
      const { error } = await supabase
        .from('company_memberships')
        .update({ role: invitation.role })
        .eq('company_id', invitation.company_id)
        .eq('user_id', userId);
      
      membershipError = error;
    } else {
      // 멤버십이 없으면 새로 생성
      const { error } = await supabase
        .from('company_memberships')
        .insert({
          company_id: invitation.company_id,
          user_id: userId,
          role: invitation.role
        });
      
      membershipError = error;
    }
    
    if (membershipError) {
      console.error('멤버십 생성/업데이트 오류:', membershipError);
      // 초대 상태를 원래대로 되돌림 (updated_at 필드 제거)
      await supabase
        .from('company_invitations')
        .update({ status: 'pending' })
        .eq('id', invitationId);
      
      return NextResponse.json({ error: '회사 멤버십 생성에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '초대가 성공적으로 수락되었습니다.',
      company_id: invitation.company_id
    });
  } catch (error) {
    console.error('초대 수락 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 