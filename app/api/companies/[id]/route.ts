import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 요청자가 회사 소유자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 소유자만 회사 삭제 가능
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: '회사 삭제 권한이 없습니다. 소유자만 회사를 삭제할 수 있습니다.' }, { status: 403 });
    }
    
    // 트랜잭션으로 회사 관련 데이터 삭제
    // 1. 초대 삭제
    const { error: invitationDeleteError } = await supabase
      .from('company_invitations')
      .delete()
      .eq('company_id', companyId);
    
    if (invitationDeleteError) {
      console.error('초대 삭제 오류:', invitationDeleteError);
      return NextResponse.json({ error: '회사 초대 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 2. 멤버십 삭제
    const { error: membershipDeleteError } = await supabase
      .from('company_memberships')
      .delete()
      .eq('company_id', companyId);
    
    if (membershipDeleteError) {
      console.error('멤버십 삭제 오류:', membershipDeleteError);
      return NextResponse.json({ error: '회사 멤버십 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 3. 회사 삭제
    const { error: companyDeleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);
    
    if (companyDeleteError) {
      console.error('회사 삭제 오류:', companyDeleteError);
      return NextResponse.json({ error: '회사 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '회사가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('회사 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 메서드 추가
export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 요청 본문 파싱
    const body = await req.json();
    const { name, description } = body;
    
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: '회사 이름은 최소 2자 이상이어야 합니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 요청자가 회사의 소유자 또는 관리자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 소유자나 관리자만 회사 정보 수정 가능
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: '회사 정보 수정 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사 정보 업데이트
    const { data, error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('회사 정보 업데이트 오류:', updateError);
      return NextResponse.json({ error: '회사 정보 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('회사 정보 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 