import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 관리자 대시보드 데이터를 제공하는 API 라우트
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
  const dashboardData = {
    stats: {
      totalUsers: 120,
      totalCompanies: 45,
      activeUsers: 87,
      pendingInvitations: 12
    },
    recentActivities: [
      { 
        id: 1, 
        type: 'user_joined', 
        userName: '김철수', 
        companyName: '테스트 회사', 
        timestamp: new Date().toISOString() 
      },
      { 
        id: 2, 
        type: 'company_created', 
        userName: '박영희', 
        companyName: '새 회사', 
        timestamp: new Date().toISOString() 
      }
    ]
  };

  return NextResponse.json(dashboardData);
} 