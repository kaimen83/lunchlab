import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMarketplaceModules } from '@/lib/marketplace/queries';

/**
 * 마켓플레이스 모듈 목록을 조회하는 API
 * GET /api/marketplace/modules
 */
export async function GET() {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 모듈 목록 조회
    const { modules, error } = await getMarketplaceModules();
    
    if (error) {
      console.error('마켓플레이스 모듈 목록 조회 오류:', error);
      return NextResponse.json({ error: '모듈 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ modules });
  } catch (error) {
    console.error('마켓플레이스 모듈 목록 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 