import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 요청 바디에서 프로필 정보 추출
    const body = await req.json();
    const { name, phoneNumber, affiliation } = body;
    
    // 필수 필드 검증
    if (!name || !phoneNumber || !affiliation) {
      return NextResponse.json({ error: '이름, 전화번호, 소속은 필수 입력항목입니다.' }, { status: 400 });
    }
    
    // 프로필 객체 생성
    const profile: UserProfile = {
      name,
      phoneNumber,
      affiliation,
    };
    
    // 현재 사용자의 메타데이터 조회
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};
    
    // 기존 메타데이터를 유지하면서 프로필 정보만 업데이트
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...currentMetadata,  // 기존 메타데이터(role 포함) 유지
        profileCompleted: true,
        profile
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '프로필 업데이트에 실패했습니다.' }, { status: 500 });
  }
} 