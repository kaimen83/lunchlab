import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAnyAdmin, updateUserRole, isHeadAdmin } from '@/lib/clerk';
import { UserRole } from '@/lib/types';

export async function POST(req: Request) {
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
    
    // 요청 바디에서 변경할 사용자 ID와 역할 추출
    const body = await req.json();
    const { targetUserId, role } = body;
    
    if (!targetUserId || !role) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    // 역할 유효성 검사
    const validRoles: UserRole[] = ['headAdmin', 'companyAdmin', 'worker', 'tester', 'pending'];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 });
    }
    
    // 최고 관리자 권한으로 변경 시 추가 검증
    if (role === 'headAdmin') {
      const isUserHeadAdmin = await isHeadAdmin(userId);
      if (!isUserHeadAdmin) {
        return NextResponse.json({ error: '최고 관리자 권한은 기존 최고 관리자만 부여할 수 있습니다.' }, { status: 403 });
      }
    }
    
    // 사용자 역할 업데이트
    await updateUserRole(targetUserId, role as UserRole);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: '역할 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 