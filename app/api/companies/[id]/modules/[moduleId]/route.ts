import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCompanyModuleSubscription, unsubscribeCompanyFromModule } from '@/lib/marketplace/queries';

interface RouteContext {
  params: Promise<{
    id: string;
    moduleId: string;
  }>;
}

/**
 * 회사의 특정 모듈 구독 정보를 조회하는 API
 * GET /api/companies/[id]/modules/[moduleId]
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
    const { id: companyId, moduleId } = await context.params;
    
    if (!companyId || !moduleId) {
      return NextResponse.json({ error: '회사 ID와 모듈 ID는 필수 항목입니다.' }, { status: 400 });
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
    
    // 모듈 구독 정보 조회
    const { subscription, error } = await getCompanyModuleSubscription(companyId, moduleId);
    
    if (error) {
      console.error('모듈 구독 정보 조회 오류:', error);
      return NextResponse.json({ error: '모듈 구독 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!subscription) {
      return NextResponse.json({ error: '해당 모듈의 구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('모듈 구독 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * 회사의 모듈 구독을 취소하는 API
 * DELETE /api/companies/[id]/modules/[moduleId]
 */
export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId, moduleId } = await context.params;
    
    if (!companyId || !moduleId) {
      return NextResponse.json({ error: '회사 ID와 모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인 (관리자 이상만 구독 취소 가능)
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
      return NextResponse.json({ error: '모듈 구독 취소 권한이 없습니다. 관리자 또는 소유자만 구독을 취소할 수 있습니다.' }, { status: 403 });
    }
    
    // 모듈 구독 취소 처리
    const { success, error } = await unsubscribeCompanyFromModule(companyId, moduleId);
    
    if (error) {
      console.error('모듈 구독 취소 오류:', error);
      return NextResponse.json({ error: '모듈 구독 취소 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!success) {
      return NextResponse.json({ error: '모듈 구독 취소에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: '모듈 구독이 취소되었습니다.'
    });
  } catch (error) {
    console.error('모듈 구독 취소 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 