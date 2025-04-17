import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { UserProfile } from '@/lib/types';

// 간단한 메모리 캐시 구현
// 실제 프로덕션에서는 Redis 등의 외부 캐시 시스템을 사용하는 것이 좋음
const userCache = new Map<string, any>();
const CACHE_TTL = 300000; // 5분 캐시 유효시간 (ms)

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

    // 캐시에서 사용자 정보 조회 및 누락된 ID 찾기
    const cacheResults: Record<string, any> = {};
    const missingIds: string[] = [];
    
    // 캐시 확인
    userIds.forEach(id => {
      const cacheEntry = userCache.get(id);
      if (cacheEntry && cacheEntry.expiry > Date.now()) {
        cacheResults[id] = cacheEntry.data;
      } else {
        // 캐시에 없거나 만료된 경우
        if (cacheEntry) userCache.delete(id); // 만료된 항목 삭제
        missingIds.push(id);
      }
    });
    
    // 누락된 ID가 있는 경우에만 API 호출
    let apiUsers: any[] = [];
    if (missingIds.length > 0) {
      // Clerk API를 통해 사용자 정보 조회
      const client = await clerkClient();
      
      // getUserList API는 한 번에 최대 100명까지 조회 가능
      const users = await client.users.getUserList({
        userId: missingIds,  // string[] 타입의 missingIds 사용
        limit: 100
      });
      
      // 가공된 사용자 정보
      apiUsers = users.data.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0]?.emailAddress,
        profileCompleted: !!user.publicMetadata.profileCompleted,
        profile: user.publicMetadata.profile as UserProfile || null
      }));
      
      // 새로 조회한 사용자 정보를 캐시에 저장
      apiUsers.forEach(user => {
        userCache.set(user.id, {
          data: user,
          expiry: Date.now() + CACHE_TTL
        });
        cacheResults[user.id] = user;
      });
    }
    
    // 캐시 결과와 API 결과 통합
    const combinedUsers = userIds.map(id => cacheResults[id]).filter(Boolean);
    
    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error('사용자 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 