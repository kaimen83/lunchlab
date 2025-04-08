import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { Database } from '@/types/supabase';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const ingredientSchema = z.object({
  name: z
    .string()
    .min(1, { message: '식재료 이름은 필수입니다.' })
    .max(100, { message: '식재료 이름은 100자 이하여야 합니다.' }),
  package_amount: z
    .number()
    .min(0.1, { message: '포장량은 0.1 이상이어야 합니다.' }),
  unit: z
    .string()
    .min(1, { message: '단위는 필수입니다.' })
    .max(20, { message: '단위는 20자 이하여야 합니다.' }),
  price: z
    .number()
    .min(0, { message: '가격은 0 이상이어야 합니다.' }),
  memo1: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional()
    .nullable(),
  memo2: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional()
    .nullable(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사의 식재료 목록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

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

    // 식재료 목록 조회
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      console.error('식재료 목록 조회 오류:', error);
      return Response.json({ error: '식재료 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(ingredients || []);
  } catch (error) {
    console.error('식재료 목록 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 추가
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = auth();

    if (!userId) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

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
    const validationResult = ingredientSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return Response.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const ingredient = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 식재료 추가
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        company_id: companyId,
        name: ingredient.name,
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        memo1: ingredient.memo1 || null,
        memo2: ingredient.memo2 || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('식재료 추가 오류:', error);
      return Response.json({ error: '식재료 추가에 실패했습니다.' }, { status: 500 });
    }

    // 가격 이력 추가
    const { error: historyError } = await supabase
      .from('ingredient_price_history')
      .insert({
        ingredient_id: data.id,
        price: ingredient.price,
      });

    if (historyError) {
      console.error('가격 이력 추가 오류:', historyError);
      // 이력 추가 실패는 심각한 오류가 아니므로 계속 진행
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('식재료 추가 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 