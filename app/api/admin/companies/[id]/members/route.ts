import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import { createClient } from '@/utils/supabase/server';
import { getAllUsers } from '@/lib/clerk';

// 회사 멤버 목록 조회
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
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
    // params는 Promise이므로 await 사용해야 함
    const { id } = await params;
    
    // Supabase 클라이언트 생성
    const supabase = createClient();
    
    // 회사 멤버십 조회
    const { data: memberships, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', id);
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버 목록을 가져오는 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 모든 사용자 목록 가져오기
    const allUsers = await getAllUsers();
    
    // 멤버십에 해당하는 사용자 정보 매핑
    const members = memberships.map(membership => {
      const user = allUsers.find(user => user.id === membership.user_id);
      if (!user) return null;
      
      return {
        ...user,
        role: membership.role // membership의 role 정보 사용
      };
    }).filter(Boolean); // null 값 제외
    
    return NextResponse.json({ members });
  } catch (error) {
    console.error('회사 멤버 조회 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 