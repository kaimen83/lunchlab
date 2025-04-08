import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { isUserCompanyAdmin } from '@/actions/membership-actions';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 유효성 검사 스키마
const featureSchema = z.object({
  featureName: z
    .string()
    .min(1, { message: '기능 이름은 필수입니다.' }),
  isEnabled: z
    .boolean(),
  config: z
    .record(z.unknown())
    .optional()
    .nullable()
});

// 회사 기능 조회
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

    // 관리자 권한 확인
    const isAdmin = await isUserCompanyAdmin({ userId, companyId });
    if (!isAdmin) {
      return Response.json({ error: '이 작업을 수행할 권한이 없습니다.' }, { status: 403 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 회사 기능 조회
    const { data: features, error } = await supabase
      .from('company_features')
      .select('*')
      .eq('company_id', companyId);

    if (error) {
      console.error('기능 목록 조회 오류:', error);
      return Response.json({ error: '기능 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return Response.json(features || []);
  } catch (error) {
    console.error('기능 목록 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 회사 기능 설정
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

    // 관리자 권한 확인
    const isAdmin = await isUserCompanyAdmin({ userId, companyId });
    if (!isAdmin) {
      return Response.json({ error: '이 작업을 수행할 권한이 없습니다.' }, { status: 403 });
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    
    // 데이터 유효성 검사
    const validationResult = featureSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return Response.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const featureData = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 기존 설정 확인
    const { data: existingFeature, error: fetchError } = await supabase
      .from('company_features')
      .select('id')
      .eq('company_id', companyId)
      .eq('feature_name', featureData.featureName)
      .maybeSingle();
    
    if (fetchError) {
      console.error('기능 확인 오류:', fetchError);
      return Response.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    let result;
    
    if (existingFeature) {
      // 기존 설정 업데이트
      const { data, error } = await supabase
        .from('company_features')
        .update({
          is_enabled: featureData.isEnabled,
          config: featureData.config || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFeature.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('기능 업데이트 오류:', error);
        return Response.json({ error: '기능 설정 업데이트에 실패했습니다.' }, { status: 500 });
      }
      
      result = data;
    } else {
      // 새 설정 추가
      const { data, error } = await supabase
        .from('company_features')
        .insert({
          company_id: companyId,
          feature_name: featureData.featureName,
          is_enabled: featureData.isEnabled,
          config: featureData.config || null,
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('기능 추가 오류:', error);
        return Response.json({ error: '기능 설정 추가에 실패했습니다.' }, { status: 500 });
      }
      
      result = data;
    }

    return Response.json(result);
  } catch (error) {
    console.error('기능 설정 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 