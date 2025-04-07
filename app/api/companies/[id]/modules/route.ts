import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCompanyModules, subscribeCompanyToModule } from '@/lib/marketplace/queries';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 회사의 모듈 구독 목록을 조회하는 API
 * GET /api/companies/[id]/modules
 */
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인
    const supabase = createServerSupabaseClient();
    
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버십 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 모듈 구독 목록 조회
    const { modules, error } = await getCompanyModules(companyId);
    
    if (error) {
      console.error('회사 모듈 구독 목록 조회 오류:', error);
      return NextResponse.json({ error: '모듈 구독 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ modules });
  } catch (error) {
    console.error('회사 모듈 구독 목록 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * 회사에 모듈을 구독하는 API
 * POST /api/companies/[id]/modules
 */
export async function POST(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 요청 본문 파싱
    const body = await req.json();
    const { moduleId } = body;
    
    if (!moduleId) {
      return NextResponse.json({ error: '모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인 (관리자 이상만 구독 가능)
    const supabase = createServerSupabaseClient();
    
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버십 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: '모듈 구독 권한이 없습니다. 관리자 또는 소유자만 모듈을 구독할 수 있습니다.' }, { status: 403 });
    }
    
    // 모듈 구독 처리
    const { subscription, error } = await subscribeCompanyToModule(companyId, moduleId, userId);
    
    if (error) {
      console.error('모듈 구독 처리 오류:', error);
      return NextResponse.json({ error: '모듈 구독 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      subscription,
      message: subscription?.status === 'pending' 
        ? '모듈 구독 요청이 접수되었습니다. 승인 후 이용 가능합니다.' 
        : '모듈 구독이 완료되었습니다.'
    }, { status: 201 });
  } catch (error) {
    console.error('모듈 구독 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 