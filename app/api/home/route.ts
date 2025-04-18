import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 홈 페이지 데이터를 제공하는 API 라우트
 * - 실제 구현 시 데이터베이스 쿼리 등을 추가
 */
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: '인증 실패' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // 실제 구현 시 데이터베이스에서 데이터 조회 추가
  const homeData = {
    userGreeting: '안녕하세요!',
    notificationCount: 3,
    quickStats: {
      totalCompanies: 2,
      pendingInvitations: 1
    }
  };

  return NextResponse.json(homeData);
} 