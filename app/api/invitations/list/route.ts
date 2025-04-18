import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 초대 목록 데이터를 제공하는 API 라우트
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
  const invitationsData = {
    sentInvitations: [
      { 
        id: 1, 
        email: 'test1@example.com', 
        companyName: '테스트 회사', 
        status: 'pending',
        sentAt: new Date().toISOString() 
      },
      { 
        id: 2, 
        email: 'test2@example.com', 
        companyName: '테스트 회사', 
        status: 'accepted',
        sentAt: new Date().toISOString() 
      }
    ],
    receivedInvitations: [
      { 
        id: 3, 
        senderName: '홍길동', 
        companyName: '새 회사', 
        status: 'pending',
        sentAt: new Date().toISOString() 
      }
    ]
  };

  return NextResponse.json(invitationsData);
} 