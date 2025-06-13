import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 여러 사용자 정보를 한 번에 가져오는 API
 * POST 요청에 userIds 배열을 받아 해당하는 모든 사용자 정보를 반환
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }

    // 권한 확인: headAdmin이거나 요청한 사용자 ID들이 특정 회사의 멤버인지 확인
    const isAdmin = await isHeadAdmin(userId);

    if (!isAdmin) {
      // headAdmin이 아닌 경우, 요청한 사용자가 해당 회사의 멤버인지 확인
      const supabase = createServerSupabaseClient();
      
      // 요청한 사용자가 속한 회사들 조회
      const { data: userCompanies, error: userCompaniesError } = await supabase
        .from('company_memberships')
        .select('company_id')
        .eq('user_id', userId);

      if (userCompaniesError) {
        console.error('사용자 회사 조회 오류:', userCompaniesError);
        return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
      }

      const userCompanyIds = userCompanies?.map(c => c.company_id) || [];

      // 조회하려는 사용자들이 같은 회사에 속하는지 확인
      const { data: targetUserCompanies, error: targetUserCompaniesError } = await supabase
        .from('company_memberships')
        .select('user_id, company_id')
        .in('user_id', userIds);

      if (targetUserCompaniesError) {
        console.error('대상 사용자 회사 조회 오류:', targetUserCompaniesError);
        return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
      }

      // 모든 대상 사용자가 요청 사용자와 같은 회사에 속하는지 확인
      const hasPermission = targetUserCompanies?.every(tc => 
        userCompanyIds.includes(tc.company_id)
      );

      if (!hasPermission) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
    }

    // 중복 제거
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Clerk에서 사용자 정보 조회
    const client = await clerkClient();

    try {
      // 개별 사용자 조회로 변경하여 일부 사용자가 없어도 나머지는 조회되도록 함
      const userPromises = uniqueUserIds.map(async (id) => {
        try {
          const user = await client.users.getUser(id);
          return user;
        } catch (error) {
          console.warn(`사용자 ${id} 조회 실패:`, error);
          return null; // 실패한 경우 null 반환
        }
      });

      const userResults = await Promise.all(userPromises);
      const validUsers = userResults.filter(user => user !== null);
      
      // 응답 형식 맞추기
      const formattedUsers = validUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.emailAddresses?.[0]?.emailAddress || '',
        imageUrl: user.imageUrl,
        profileCompleted: user.publicMetadata?.profileCompleted || false,
        profile: user.publicMetadata?.profile || null,
        metadataName: user.publicMetadata?.name || null
      }));

      return NextResponse.json({ 
        users: formattedUsers,
        totalRequested: uniqueUserIds.length,
        totalFound: formattedUsers.length,
        missingUserIds: uniqueUserIds.filter(id => !formattedUsers.find(u => u.id === id))
      });

    } catch (clerkError) {
      console.error('Clerk API 호출 오류:', clerkError);
      return NextResponse.json({ 
        error: 'Clerk API 호출 중 오류가 발생했습니다.',
        details: clerkError instanceof Error ? clerkError.message : String(clerkError)
      }, { status: 500 });
    }

  } catch (error) {
    console.error('사용자 배치 조회 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 