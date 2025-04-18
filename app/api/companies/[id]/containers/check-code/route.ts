import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 용기 코드명 중복 확인 API
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

    // URL에서 코드명 파라미터 추출
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const excludeId = url.searchParams.get('excludeId'); // 수정 시 현재 아이템 제외
    
    console.log('[API] 용기 코드명 중복 확인 요청:', { companyId, code, excludeId });
    
    if (!code) {
      return Response.json({ error: '코드명 파라미터가 필요합니다.' }, { status: 400 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 1. containers 테이블에서 중복 코드명 확인
    let containersQuery = supabase
      .from('containers')
      .select('id, name, code_name', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('code_name', code);
    
    // 수정 모드인 경우 현재 아이템은 제외
    if (excludeId) {
      containersQuery = containersQuery.neq('id', excludeId);
    }
    
    // 쿼리 실행 (한 개만 있는지 확인하면 되므로 limit 1)
    const { data: containersData, error: containersError, count: containersCount } = await containersQuery.limit(1);

    if (containersError) {
      console.error('[API] containers 코드명 중복 확인 오류:', containersError);
      return Response.json({ 
        error: '코드명 확인 중 오류가 발생했습니다.',
        details: containersError.message 
      }, { status: 500 });
    }

    // 2. ingredients 테이블에서 중복 코드명 확인
    const { data: ingredientsData, error: ingredientsError, count: ingredientsCount } = await supabase
      .from('ingredients')
      .select('id, name, code_name', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('code_name', code)
      .limit(1);

    if (ingredientsError) {
      console.error('[API] ingredients 코드명 중복 확인 오류:', ingredientsError);
      return Response.json({ 
        error: '코드명 확인 중 오류가 발생했습니다.',
        details: ingredientsError.message 
      }, { status: 500 });
    }

    // containers 또는 ingredients 테이블에 중복 코드명이 있는지 확인
    const containersExists = containersCount !== null && containersCount > 0;
    const ingredientsExists = ingredientsCount !== null && ingredientsCount > 0;
    const exists = containersExists || ingredientsExists;
    
    console.log('[API] 용기 코드명 중복 결과:', { 
      exists, 
      containersExists,
      ingredientsExists,
      containersCount, 
      ingredientsCount,
      containersData,
      ingredientsData
    });
    
    return Response.json({ 
      exists,
      containersExists,
      ingredientsExists,
      containersCount: containersCount || 0,
      ingredientsCount: ingredientsCount || 0,
      containersData,
      ingredientsData,
      message: exists ? 
        ingredientsExists ? 
          '이미 식재료 코드명으로 사용 중입니다.' : 
          '이미 용기 코드명으로 사용 중입니다.' : 
        '사용 가능한 코드명입니다.'
    });
  } catch (error) {
    console.error('[API] 용기 코드명 중복 확인 API 오류:', error);
    return Response.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
} 