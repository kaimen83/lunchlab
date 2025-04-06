import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMemberRole } from '@/lib/types';

export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 요청 바디에서 초대 정보 추출
    const body = await req.json();
    const { company_id, invited_user_id, role = 'member' } = body;
    
    if (!company_id || !invited_user_id) {
      return NextResponse.json({ error: '회사 ID와 초대할 사용자 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 초대자가 해당 회사의 멤버인지 확인 (owner 또는 admin만 초대 가능)
    const supabase = createServerSupabaseClient();
    
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', company_id)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // owner 또는 admin만 초대 가능
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: '회사 멤버를 초대할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 초대할 사용자가 이미 회사 멤버인지 확인
    const { data: existingMembership } = await supabase
      .from('company_memberships')
      .select()
      .eq('company_id', company_id)
      .eq('user_id', invited_user_id)
      .single();
    
    if (existingMembership) {
      return NextResponse.json({ error: '이미 회사에 소속된 멤버입니다.' }, { status: 400 });
    }
    
    // 이미 초대가 진행 중인지 확인
    const { data: existingInvitation } = await supabase
      .from('company_invitations')
      .select()
      .eq('company_id', company_id)
      .eq('invited_user_id', invited_user_id)
      .eq('status', 'pending')
      .single();
    
    if (existingInvitation) {
      return NextResponse.json({ error: '이미 초대가 진행 중입니다.' }, { status: 400 });
    }
    
    // 초대 만료 시간 설정 (7일 후)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);
    
    // 초대 생성
    const { data: invitation, error: invitationError } = await supabase
      .from('company_invitations')
      .insert({
        company_id,
        invited_by: userId,
        invited_user_id,
        role: role as CompanyMemberRole,
        status: 'pending',
        expires_at: expires_at.toISOString()
      })
      .select()
      .single();
    
    if (invitationError) {
      console.error('초대 생성 오류:', invitationError);
      return NextResponse.json({ error: '초대장 생성에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('초대 생성 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 