import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUserRole } from '@/lib/clerk';

export async function POST(req: Request) {
  try {
    // 설정 가능한 비밀 키를 통해 접근 제한
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
    
    if (!ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Server not configured for admin setup' }, { status: 500 });
    }
    
    const body = await req.json();
    const { secretKey } = body;
    
    if (secretKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // 사용자에게 관리자 권한 부여
    await updateUserRole(userId, 'admin');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting admin role:', error);
    return NextResponse.json({ error: 'Failed to set admin role' }, { status: 500 });
  }
} 