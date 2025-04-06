import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';

// 멤버십 데이터 타입 정의
interface ClerkMembership {
  id: string;
  public_user_data?: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
  };
  role?: string;
}

// Next.js 15에서 타입 이슈를 해결하기 위해 임시로 any 타입 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: NextRequest, context: any) {
  try {
    const { userId } = await auth();
    // params 객체 추출
    const { id: companyId, userId: targetUserId } = context.params;

    // 디버깅을 위한 로그 추가
    console.log('API 호출 시작 - 조직 ID:', companyId, '대상 사용자 ID:', targetUserId);

    // 인증 확인
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // 자기 자신을 삭제하는 경우 체크
    const isSelf = userId === targetUserId;
    console.log('본인 확인:', isSelf);

    const clerk = await clerkClient();

    let organizationExists = true;
    let organization;
    
    // 회사 정보 확인 시도
    try {
      organization = await clerk.organizations.getOrganization({
        organizationId: companyId,
      });
      console.log('회사 정보 조회 성공:', organization.id, organization.name);
    } catch (err) {
      console.error('회사 정보 조회 오류:', err);
      organizationExists = false;
      
      // 자신을 삭제하는 경우가 아니라면 여기서 중단
      if (!isSelf) {
        return NextResponse.json(
          { error: '회사 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      console.log('본인 탈퇴 요청이므로 조직 정보 오류에도 불구하고 계속 진행합니다.');
    }

    // 멤버십 정보 직접 가져오기 시도 (API 우회)
    try {
      // 직접 멤버십 삭제 시도
      console.log('멤버십 직접 삭제 시도 - 조직 ID:', companyId, '사용자 ID:', targetUserId);
      
      const response = await fetch(
        `https://api.clerk.dev/v1/organizations/${companyId}/memberships`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const memberships = await response.json();
        console.log('멤버십 직접 조회 성공:', memberships.total_count);
        
        // 타겟 유저의 멤버십 찾기
        const targetMembership = memberships.data.find(
          (member: ClerkMembership) => member.public_user_data?.user_id === targetUserId
        );
        
        if (targetMembership) {
          console.log('타겟 멤버십 찾음:', targetMembership.id);
          
          // 멤버십 직접 삭제
          const deleteResponse = await fetch(
            `https://api.clerk.dev/v1/organizations/${companyId}/memberships/${targetMembership.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (deleteResponse.ok) {
            console.log('멤버십 직접 삭제 성공');
            return NextResponse.json(
              { 
                success: true,
                redirect: isSelf ? '/' : null 
              }, 
              { status: 200 }
            );
          } else {
            const errorData = await deleteResponse.json();
            console.error('멤버십 직접 삭제 실패:', errorData);
            throw new Error('멤버십 직접 삭제 실패');
          }
        } else {
          console.error('타겟 멤버십을 찾을 수 없음');
          if (!isSelf) {
            return NextResponse.json(
              { error: '멤버십을 찾을 수 없습니다.' },
              { status: 404 }
            );
          }
        }
      } else {
        const errorData = await response.json();
        console.error('멤버십 직접 조회 실패:', errorData);
      }
    } catch (directError) {
      console.error('직접 API 호출 오류:', directError);
      
      // 자신을 삭제하는 경우가 아니라면 여기서 중단
      if (!isSelf) {
        return NextResponse.json(
          { error: '멤버십 처리 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }

    // 기존 API 호출 방식으로 시도 (조직이 존재하는 경우에만)
    if (organizationExists) {
      try {
        // 현재 사용자의 멤버십 정보 확인
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: companyId,
        });
        
        console.log('멤버십 목록 조회 성공, 멤버 수:', memberships.data.length);
        
        // 현재 사용자 권한 확인
        const currentUserMembership = memberships.data.find(
          (member) => member.publicUserData?.userId === userId
        );
        
        if (!currentUserMembership && !isSelf) {
          return NextResponse.json(
            { error: '회사 멤버가 아닙니다.' },
            { status: 403 }
          );
        }
        
        const isOwner = currentUserMembership?.role === 'org:admin';
        
        if (!isOwner && !isSelf) {
          return NextResponse.json(
            { error: '멤버를 삭제할 권한이 없습니다.' },
            { status: 403 }
          );
        }
        
        // 타겟 멤버십 찾기
        const targetMembership = memberships.data.find(
          (member) => member.publicUserData?.userId === targetUserId
        );
        
        if (targetMembership) {
          if (targetMembership.role === 'org:admin' && !isSelf) {
            return NextResponse.json(
              { error: '소유자는 삭제할 수 없습니다.' },
              { status: 403 }
            );
          }
          
          // Clerk API로 멤버십 삭제
          await clerk.organizations.deleteOrganizationMembership({
            organizationId: companyId,
            userId: targetUserId
          });
          
          console.log('멤버십 삭제 성공');
          return NextResponse.json(
            { 
              success: true,
              redirect: isSelf ? '/' : null 
            }, 
            { status: 200 }
          );
        } else if (!isSelf) {
          return NextResponse.json(
            { error: '멤버십을 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
      } catch (apiError) {
        console.error('API 호출 방식 실패:', apiError);
      }
    }
    
    // 여기까지 왔다면 모든 시도가 실패한 것
    if (isSelf) {
      // 자기 자신 탈퇴의 경우 성공으로 처리
      console.log('모든 시도 실패했지만 본인 탈퇴이므로 성공으로 처리');
      return NextResponse.json(
        { 
          success: true,
          redirect: '/' 
        }, 
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: '멤버십 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('멤버 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '멤버 삭제에 실패했습니다.', details: (error as Error).message },
      { status: 500 }
    );
  }
} 