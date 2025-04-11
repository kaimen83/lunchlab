import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { UserProfile } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 검색어 추출
    const searchQuery = req.nextUrl.searchParams.get('q');
    
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim() === '') {
      return NextResponse.json({ error: '검색어를 입력해주세요.' }, { status: 400 });
    }
    
    // Clerk API를 통해 사용자 검색
    const client = await clerkClient();
    
    // 먼저 모든 사용자를 가져옴 (제한된 수)
    const usersResponse = await client.users.getUserList({
      limit: 100,
    });
    
    // 클라이언트 측에서 검색 (Clerk은 사용자 검색 API를 제공하지 않음)
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const searchResults = usersResponse.data.filter((user) => {
      // 현재 로그인한 사용자는 제외
      if (user.id === userId) return false;
      
      // 프로필 이름이 있는 경우 사용자 지정 이름으로 검색
      const profile = user.publicMetadata?.profile as UserProfile | undefined;
      const customName = profile?.name?.toLowerCase() || '';
      
      // 이름, 성, 이메일로 검색
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
      
      return (
        customName.includes(normalizedQuery) ||
        firstName.includes(normalizedQuery) ||
        lastName.includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        email.includes(normalizedQuery)
      );
    });
    
    // 최대 10명만 반환
    const limitedResults = searchResults.slice(0, 10);
    
    // 필요한 정보만 추출하여 반환
    const simplifiedUsers = limitedResults.map(user => {
      const profile = user.publicMetadata?.profile as UserProfile | undefined;
      const profileCompleted = !!user.publicMetadata?.profileCompleted;
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0]?.emailAddress,
        profile: profile || null,
        profileCompleted
      };
    });
    
    return NextResponse.json({ users: simplifiedUsers });
  } catch (error) {
    console.error('사용자 검색 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 