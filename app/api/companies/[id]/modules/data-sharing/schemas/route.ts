import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { getSharedDataSchemas } from '@/lib/marketplace/data-sharing';

/**
 * 회사에서 공유 가능한 데이터 스키마 목록을 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/schemas
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    // 공유 가능한 데이터 스키마 목록 조회
    const { schemas, error } = await getSharedDataSchemas(companyId);
    
    if (error) {
      console.error('데이터 스키마 조회 오류:', error);
      return NextResponse.json(
        { error: '데이터 스키마 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ schemas });
  } catch (error) {
    console.error('데이터 스키마 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 