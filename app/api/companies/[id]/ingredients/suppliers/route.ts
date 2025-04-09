import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const supplierSchema = z.object({
  name: z
    .string()
    .min(1, { message: '업체명은 필수입니다.' })
    .max(100, { message: '업체명은 100자 이하여야 합니다.' }),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 공급업체 목록 조회
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
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 공급업체 목록 조회
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      console.error('공급업체 목록 조회 오류:', error);
      return Response.json({ error: '공급업체 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(data || []);
  } catch (error) {
    console.error('공급업체 목록 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 공급업체 추가
export async function POST(request: NextRequest, context: RouteContext) {
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
    const validationResult = supplierSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return Response.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const supplier = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 중복 업체명 확인
    const { data: existingSupplier, error: checkError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', supplier.name)
      .maybeSingle();
    
    if (checkError) {
      console.error('공급업체 중복 확인 오류:', checkError);
      return Response.json({ error: '공급업체 중복 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (existingSupplier) {
      return Response.json({ error: '이미 등록된 공급업체명입니다.' }, { status: 400 });
    }

    // 공급업체 추가
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        company_id: companyId,
        name: supplier.name,
      })
      .select('*')
      .single();

    if (error) {
      console.error('공급업체 추가 오류:', error);
      return Response.json({ error: '공급업체 추가에 실패했습니다.' }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('공급업체 추가 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 