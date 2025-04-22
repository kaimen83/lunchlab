import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';

/**
 * 현재 인증된 사용자가 관리자(headAdmin) 권한을 가지고 있는지 확인하는 API
 */
export async function GET() {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { isAdmin: false, error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    // 최고 관리자(headAdmin) 여부 확인
    const headAdminCheck = await isHeadAdmin(userId);
    
    return NextResponse.json({ 
      isAdmin: headAdminCheck,
      userId
    });
  } catch (error) {
    console.error('관리자 확인 중 오류 발생:', error);
    return NextResponse.json(
      { isAdmin: false, error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 