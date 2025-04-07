import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMarketplaceModule } from '@/lib/marketplace/queries';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 특정 마켓플레이스 모듈 정보를 조회하는 API
 * GET /api/marketplace/modules/[id]
 */
export async function GET(
  req: Request, 
  context: RouteContext
) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: moduleId } = await context.params;
    
    if (!moduleId) {
      return NextResponse.json({ error: '모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 모듈 정보 조회
    const { module, features, error } = await getMarketplaceModule(moduleId);
    
    if (error) {
      console.error('마켓플레이스 모듈 정보 조회 오류:', error);
      return NextResponse.json({ error: '모듈 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!module) {
      return NextResponse.json({ error: '해당 모듈을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ module, features });
  } catch (error) {
    console.error('마켓플레이스 모듈 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 