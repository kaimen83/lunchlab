import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface RouteContext {
  params: Promise<{
    id: string;
    ingredientId: string;
  }>;
}

// 식재료 가격 이력 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId, ingredientId } = await context.params;
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
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 해당 식재료가 회사의 것인지 확인
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .single();

    if (ingredientError || !ingredient) {
      return Response.json({ error: '해당 식재료를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 가격 이력 조회
    const { data: priceHistory, error: historyError } = await supabase
      .from('ingredient_price_history')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('가격 이력 조회 오류:', historyError);
      return Response.json({ error: '가격 이력을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(priceHistory || []);
  } catch (error) {
    console.error('가격 이력 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 