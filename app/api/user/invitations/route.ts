import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';

// 초대자 정보를 담을 인터페이스 정의
interface InviterInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  email: string;
}

export async function GET(req: NextRequest) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 상태 필터링 (기본값: pending)
    const status = req.nextUrl.searchParams.get('status') || 'pending';
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();
    
    // 초대 목록 조회 쿼리 - 회사 정보만 조인하고 초대자 정보는 별도로 가져옴
    let query = supabase
      .from('company_invitations')
      .select(`
        id,
        company_id,
        invited_by,
        invited_user_id,
        role,
        status,
        created_at,
        expires_at,
        company:companies(id, name, description)
      `)
      .eq('invited_user_id', userId);
    
    // 상태 필터링 적용
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // 최신순 정렬
    query = query.order('created_at', { ascending: false });
    
    const { data: invitations, error } = await query;
    
    if (error) {
      console.error('초대 목록 조회 오류:', error);
      return NextResponse.json({ error: '초대 목록 조회에 실패했습니다.' }, { status: 500 });
    }
    
    // 초대가 없는 경우 빈 배열 반환
    if (!invitations || invitations.length === 0) {
      return NextResponse.json({ invitations: [] });
    }
    
    // 초대한 사용자의 ID 목록 추출 (중복 제거)
    const inviterIds = Array.from(new Set(invitations.map(invitation => invitation.invited_by)));
    
    // 초대자 정보 가져오기 (Clerk에서)
    let inviterDetails: Record<string, InviterInfo> = {};
    
    if (inviterIds.length > 0) {
      try {
        const client = await clerkClient();
        const users = await client.users.getUserList({
          userId: inviterIds,
        });
        
        // 초대자 정보를 ID를 키로 하여 객체에 저장
        inviterDetails = users.data.reduce((acc, user) => {
          acc[user.id] = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            email: user.emailAddresses[0]?.emailAddress || '',
          };
          return acc;
        }, {} as Record<string, InviterInfo>);
      } catch (error) {
        console.error('초대자 정보 조회 오류:', error);
        // 초대자 정보 조회 실패해도 초대 목록은 반환
      }
    }
    
    // 응답 데이터 가공 - 초대자 정보 추가 및 만료 여부 확인
    const enhancedInvitations = invitations.map(invitation => {
      const inviterId = invitation.invited_by;
      const inviter = inviterDetails[inviterId] || {
        id: inviterId,
        firstName: null,
        lastName: null,
        imageUrl: null,
        email: '알 수 없음',
      };
      
      return {
        ...invitation,
        // updated_at 필드 추가 (null로 설정)
        updated_at: null,
        // 초대자 정보 추가
        inviter: {
          id: inviter.id,
          firstName: inviter.firstName,
          lastName: inviter.lastName,
          imageUrl: inviter.imageUrl,
          email: inviter.email,
        },
        // 만료 여부 확인
        isExpired: invitation.expires_at ? new Date(invitation.expires_at) < new Date() : false,
      };
    });
    
    return NextResponse.json({ invitations: enhancedInvitations });
  } catch (error) {
    console.error('초대 목록 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 