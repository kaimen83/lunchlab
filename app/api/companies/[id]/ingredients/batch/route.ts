import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const batchRequestSchema = z.object({
  ids: z.array(z.string()).nonempty({ message: '식재료 ID 목록이 필요합니다.' }),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 식재료 일괄 조회 API
export async function POST(request: Request, context: RouteContext) {
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
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    
    // 데이터 유효성 검사
    const validationResult = batchRequestSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return Response.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const { ids } = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 식재료 일괄 조회
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('id, name, package_amount, unit, price, calories, protein, fat, carbs')
      .in('id', ids)
      .eq('company_id', companyId);

    if (error) {
      console.error('식재료 일괄 조회 오류:', error);
      return Response.json({ error: '식재료 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(ingredients || []);
  } catch (error) {
    console.error('식재료 일괄 조회 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 