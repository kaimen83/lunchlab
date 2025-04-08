import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { UserProfile } from '@/lib/types';

export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 요청 바디에서 사용자 ID 배열 추출
    const { userIds } = await req.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }
    
    // Clerk API를 통해 사용자 정보 조회
    // Clerk Client를 사용해 사용자 정보 조회
    const client = await clerkClient();
    
    // getUserList API는 한 번에 최대 100명까지 조회 가능
    const users = await client.users.getUserList({
      userId: userIds,  // string[] 타입의 userIds 사용
      limit: 100
    });
    
    // 필요한 정보만 추출하여 반환
    const simplifiedUsers = users.data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress,
      profileCompleted: !!user.publicMetadata.profileCompleted,
      profile: user.publicMetadata.profile as UserProfile || null
    }));
    
    return NextResponse.json({ users: simplifiedUsers });
  } catch (error) {
    console.error('사용자 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 