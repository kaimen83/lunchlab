import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { unsubscribeCompanyFromModule, getCompanyModuleSubscription } from '@/lib/marketplace/queries';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';

/**
 * 회사-모듈 구독 취소 API
 * POST /api/companies/:id/modules/:moduleId/unsubscribe
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; moduleId: string } }
) {
  try {
    const { id: companyId, moduleId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 모듈 구독 취소 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ error: '모듈 구독 취소 권한이 없습니다.' }, { status: 403 });
    }
    
    // 구독 정보 확인
    const { subscription: existingSubscription } = await getCompanyModuleSubscription(companyId, moduleId);
    
    if (!existingSubscription) {
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (existingSubscription.status !== 'active' && existingSubscription.status !== 'suspended') {
      return NextResponse.json(
        { error: '취소할 수 있는 구독 상태가 아닙니다.' }, 
        { status: 400 }
      );
    }
    
    // 구독 취소 처리
    const { success, error } = await unsubscribeCompanyFromModule(companyId, moduleId);
    
    if (error || !success) {
      console.error('모듈 구독 취소 오류:', error);
      return NextResponse.json(
        { error: '모듈 구독 취소 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '모듈 구독이 취소되었습니다.'
    });
  } catch (error) {
    console.error('모듈 구독 취소 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 