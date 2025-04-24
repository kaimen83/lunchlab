import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';

/**
 * 여러 사용자 정보를 한 번에 가져오는 API
 * POST 요청에 userIds 배열을 받아 해당하는 모든 사용자 정보를 반환
 */
export async function POST(req: Request) {
  try {
    // 요청자 인증 확인
    const { userId } = await auth();
    console.log('인증된 사용자 ID:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 권한 확인 (관리자만 접근 가능)
    const isAdmin = await isHeadAdmin(userId);
    console.log('사용자 권한:', isAdmin ? 'headAdmin' : 'not admin');
    
    if (!isAdmin) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 요청 본문에서 사용자 ID 목록 가져오기
    const body = await req.json();
    const { userIds } = body;
    console.log('요청된 사용자 ID 목록:', userIds);

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '유효한 사용자 ID 목록이 필요합니다.' }, { status: 400 });
    }

    // 중복 제거 및 유효성 검사
    const uniqueUserIds = [...new Set(userIds)];
    console.log('중복 제거된 사용자 ID 목록:', uniqueUserIds);
    
    // Clerk API를 통해 사용자 정보 일괄 조회
    const client = await clerkClient();
    console.log('클라이언트 생성 완료');
    
    const response = await client.users.getUserList({
      userId: uniqueUserIds
    });
    console.log('Clerk API 응답 구조:', {
      responseType: typeof response,
      hasData: !!response.data,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : 'not an array'
    });

    // 응답 데이터 구성 - Clerk API는 PaginatedResourceResponse 타입을 반환
    const userData = response.data.map(user => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : (user.firstName || user.username || user.emailAddresses[0]?.emailAddress),
      username: user.username,
      imageUrl: user.imageUrl,
    }));
    console.log('변환된 사용자 데이터:', userData.length);

    return NextResponse.json({ users: userData });
  } catch (error) {
    console.error('사용자 정보 일괄 조회 오류:', error);
    return NextResponse.json({ 
      error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 