import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';

// 사용자 ID 목록으로 이름 조회
export async function POST(req: NextRequest) {
  // 현재 인증된 사용자 확인
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }
  
  // 관리자 권한 확인
  const isAdmin = await isHeadAdmin(userId);
  
  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  
  try {
    // 요청 본문에서 사용자 ID 목록 가져오기
    const { userIds } = await req.json();
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '유효한 사용자 ID 목록이 필요합니다.' }, { status: 400 });
    }
    
    // Clerk API를 사용하여 사용자 정보 조회
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      userId: userIds,
    });
    
    // 사용자 ID와 이름 간의 매핑 생성
    const nameMap: Record<string, string> = {};
    
    // data 속성을 통해 사용자 배열에 접근
    for (const user of usersResponse.data) {
      let displayName = '알 수 없음';
      
      // 사용자 프로필 이름이 있는 경우
      if (user.publicMetadata.profileCompleted && user.publicMetadata.profile) {
        const profile = user.publicMetadata.profile as { name: string };
        if (profile.name) {
          displayName = profile.name;
        }
      } 
      // 이름이 있는 경우
      else if (user.firstName || user.lastName) {
        displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      // 이메일이 있는 경우 이메일의 앞부분 사용
      else if (user.emailAddresses && user.emailAddresses.length > 0) {
        const email = user.emailAddresses[0].emailAddress;
        displayName = email.split('@')[0];
      }
      
      nameMap[user.id] = displayName;
    }
    
    return NextResponse.json({ names: nameMap });
  } catch (error) {
    console.error('사용자 이름 조회 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 