import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { subscribeCompanyToModule } from '@/lib/marketplace/queries';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';

/**
 * 회사-모듈 구독 생성 API
 * POST /api/companies/:id/modules/:moduleId/subscribe
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
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 모듈 구독 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ error: '모듈 구독 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사-모듈 구독 생성
    const { subscription, error } = await subscribeCompanyToModule(companyId, moduleId, userId);
    
    if (error) {
      console.error('모듈 구독 생성 오류:', error);
      return NextResponse.json(
        { error: '모듈 구독 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('모듈 구독 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 