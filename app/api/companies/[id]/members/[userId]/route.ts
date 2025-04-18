import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMemberRole } from '@/lib/types';

// Next.js 15에서 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
    userId: string;
  }>;
}

// PATCH: 멤버 역할 변경 API
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    // Next.js 15에서는 params가 Promise이므로 await로 처리
    const { id: companyId, userId: targetUserId } = await context.params;

    // 요청 본문에서 새 역할 가져오기
    const body = await request.json();
    const { role } = body;

    // 역할 값 검증
    if (!role || !['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      );
    }

    // 인증 확인
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 회사가 존재하는지 확인
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('회사 정보 조회 오류:', companyError);
      return NextResponse.json(
        { error: '회사 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 사용자의 회사 내 역할 확인
    const { data: currentUserMembership, error: currentUserMembershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    // 타겟 사용자의 회사 내 역할 확인
    const { data: targetUserMembership, error: targetUserMembershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', targetUserId)
      .single();

    // 현재 사용자의 권한 체크
    if (currentUserMembershipError) {
      console.error('현재 사용자의 멤버십 조회 오류:', currentUserMembershipError);
      return NextResponse.json(
        { error: '회사 멤버가 아닙니다.' },
        { status: 403 }
      );
    }

    // owner만 역할 변경 가능
    if (currentUserMembership.role !== 'owner') {
      return NextResponse.json(
        { error: '역할을 변경할 권한이 없습니다. 회사 소유자만 역할을 변경할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 타겟 멤버십 확인
    if (targetUserMembershipError) {
      console.error('타겟 멤버십 조회 오류:', targetUserMembershipError);
      return NextResponse.json(
        { error: '멤버십을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 소유자 역할 변경 시 확인
    if (role === 'owner') {
      // 현재 소유자를 찾아 admin으로 변경
      const { data: currentOwners, error: ownersError } = await supabase
        .from('company_memberships')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', 'owner');
      
      if (ownersError) {
        console.error('현재 소유자 조회 오류:', ownersError);
        return NextResponse.json(
          { error: '소유자 정보를 조회하는데 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 트랜잭션으로 처리해야 하지만, 현재 구현에서는 순차적으로 처리
      // 기존 소유자를 admin으로 변경
      for (const owner of currentOwners) {
        // 요청 대상이 되는 사용자는 건너뜀 (역할이 owner로 바뀔 예정)
        if (owner.user_id === targetUserId) continue;
        
        const { error: updateError } = await supabase
          .from('company_memberships')
          .update({ role: 'admin' as CompanyMemberRole, updated_at: new Date().toISOString() })
          .eq('id', owner.id);
        
        if (updateError) {
          console.error('기존 소유자 역할 변경 오류:', updateError);
          return NextResponse.json(
            { error: '기존 소유자의 역할을 변경하는데 실패했습니다.' },
            { status: 500 }
          );
        }
      }
    }

    // 타겟 사용자의 역할 업데이트
    const { error: updateError } = await supabase
      .from('company_memberships')
      .update({ 
        role: role as CompanyMemberRole,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('user_id', targetUserId);

    if (updateError) {
      console.error('역할 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '역할 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('역할 업데이트 성공');
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('역할 변경 중 오류 발생:', error);
    return NextResponse.json(
      { error: '역할 변경에 실패했습니다.', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 기존 DELETE 메서드는 그대로 유지
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    // Next.js 15에서는 params가 Promise이므로 await로 처리
    const { id: companyId, userId: targetUserId } = await context.params;

    // 디버깅을 위한 로그 추가
    console.log('API 호출 시작 - 회사 ID:', companyId, '대상 사용자 ID:', targetUserId);

    // 인증 확인
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // 자기 자신을 삭제하는 경우 체크
    const isSelf = userId === targetUserId;
    console.log('본인 탈퇴 확인:', isSelf);

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 회사가 존재하는지 확인
    const { error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('회사 정보 조회 오류:', companyError);
      
      // 자신을 삭제하는 경우가 아니라면 여기서 중단
      if (!isSelf) {
        return NextResponse.json(
          { error: '회사 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      console.log('본인 탈퇴 요청이므로 회사 정보 오류에도 불구하고 계속 진행합니다.');
    }

    // 현재 사용자의 회사 내 역할 확인
    const { data: currentUserMembership, error: currentUserMembershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    // 타겟 사용자의 회사 내 역할 확인
    const { data: targetUserMembership, error: targetUserMembershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', targetUserId)
      .single();

    // 타겟 멤버십이 존재하지 않는 경우
    if (targetUserMembershipError && !isSelf) {
      console.error('타겟 멤버십 조회 오류:', targetUserMembershipError);
      return NextResponse.json(
        { error: '멤버십을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 사용자가 회사의 소유자가 아니고 자기 자신을 삭제하는 경우가 아니라면 권한 체크
    if (!isSelf) {
      if (currentUserMembershipError) {
        console.error('현재 사용자의 멤버십 조회 오류:', currentUserMembershipError);
        return NextResponse.json(
          { error: '회사 멤버가 아닙니다.' },
          { status: 403 }
        );
      }

      if (currentUserMembership.role !== 'owner') {
        return NextResponse.json(
          { error: '멤버를 삭제할 권한이 없습니다.' },
          { status: 403 }
        );
      }

      // 타겟 사용자가 소유자인 경우 삭제 불가
      if (targetUserMembership && targetUserMembership.role === 'owner') {
        return NextResponse.json(
          { error: '소유자는 삭제할 수 없습니다.' },
          { status: 403 }
        );
      }
    }

    // Supabase에서 멤버십 삭제
    const { error: deletionError } = await supabase
      .from('company_memberships')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', targetUserId);

    if (deletionError) {
      console.error('멤버십 삭제 오류:', deletionError);
      return NextResponse.json(
        { error: '멤버십 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('멤버십 삭제 성공');
    return NextResponse.json(
      { 
        success: true,
        redirect: isSelf ? '/' : null 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('멤버 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '멤버 삭제에 실패했습니다.', details: (error as Error).message },
      { status: 500 }
    );
  }
} 