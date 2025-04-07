import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;

    // 로그인하지 않은 경우
    if (!userId) {
      return Response.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // 현재 사용자의 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    // 회사 멤버가 아니거나 권한이 없는 경우
    if (membershipError || !membership) {
      return Response.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const isAdmin = membership.role === 'owner' || membership.role === 'admin';

    // 관리자 또는 소유자가 아닌 경우
    if (!isAdmin) {
      return Response.json({ count: 0 }, { status: 200 });
    }

    // 가입 신청 개수 조회
    const { count, error } = await supabase
      .from('company_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (error) {
      console.error('가입 신청 개수 조회 오류:', error);
      return Response.json({ error: '가입 신청 개수 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json({ count: count || 0 });
  } catch (error) {
    console.error('가입 신청 개수 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 