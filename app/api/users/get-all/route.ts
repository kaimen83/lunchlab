import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAnyAdmin, getAllUsers } from '@/lib/clerk';

export async function GET() {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 관리자 권한 확인
    const adminCheck = await isAnyAdmin(userId);
    if (!adminCheck) {
      return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
    }
    
    // 모든 사용자 목록 조회
    const users = await getAllUsers();
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: '사용자 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 