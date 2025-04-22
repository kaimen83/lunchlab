import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface RouteContext {
  params: {
    id: string;
  };
}

// 메뉴 이름 중복 확인 API
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const session = await auth();
    
    if (!session || !session.userId) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const userId = session.userId;

    // 회사 정보 조회
    const company = await getServerCompany(companyId);
    if (!company) {
      return Response.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 멤버십 확인
    const membership = await getUserMembership({ userId, companyId });
    if (!membership) {
      return Response.json({ error: '이 회사에 접근할 권한이 없습니다.' }, { status: 403 });
    }

    // 기능 활성화 확인
    const isEnabled = await isFeatureEnabled('menus', companyId);
    if (!isEnabled) {
      return Response.json({ error: '메뉴 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // URL에서 이름 파라미터 추출
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const excludeId = url.searchParams.get('excludeId'); // 수정 시 현재 아이템 제외
    
    console.log('[API] 메뉴 이름 중복 확인 요청:', { companyId, name, excludeId });
    
    if (!name) {
      return Response.json({ error: '이름 파라미터가 필요합니다.' }, { status: 400 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // menus 테이블에서 중복 이름 확인
    let menusQuery = supabase
      .from('menus')
      .select('id, name', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('name', name);
    
    // 수정 모드인 경우 현재 아이템은 제외
    if (excludeId) {
      menusQuery = menusQuery.neq('id', excludeId);
    }
    
    // 쿼리 실행 (한 개만 있는지 확인하면 되므로 limit 1)
    const { data: menusData, error: menusError, count: menusCount } = await menusQuery.limit(1);

    if (menusError) {
      console.error('[API] 메뉴 이름 중복 확인 오류:', menusError);
      return Response.json({ 
        error: '이름 확인 중 오류가 발생했습니다.',
        details: menusError.message 
      }, { status: 500 });
    }

    const exists = menusCount !== null && menusCount > 0;
    
    console.log('[API] 메뉴 이름 중복 결과:', { 
      exists, 
      menusCount,
      menusData
    });
    
    return Response.json({ 
      exists,
      menusCount: menusCount || 0,
      menusData,
      message: exists ? 
        '이미 사용 중인 메뉴 이름입니다. 다른 이름을 사용해주세요.' : 
        '사용 가능한 메뉴 이름입니다.'
    });
  } catch (error) {
    console.error('[API] 메뉴 이름 중복 확인 API 오류:', error);
    return Response.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 