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
    supplierId: string;
  }>;
}

// 특정 공급업체 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId, supplierId } = await context.params;
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

    // 특정 공급업체 조회
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('공급업체 조회 오류:', error);
      return Response.json({ error: '공급업체를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (!supplier) {
      return Response.json({ error: '공급업체를 찾을 수 없습니다.' }, { status: 404 });
    }

    return Response.json(supplier);
  } catch (error) {
    console.error('공급업체 조회 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 공급업체 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId, supplierId } = await context.params;
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

    // 권한 확인 (admin 또는 owner만 수정 가능)
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return Response.json({ error: '공급업체를 수정할 권한이 없습니다.' }, { status: 403 });
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
    
    const supplierData = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 공급업체 존재 확인
    const { data: existingSupplier, error: checkError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .single();

    if (checkError || !existingSupplier) {
      return Response.json({ error: '공급업체를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 중복 업체명 확인 (다른 공급업체와 이름 중복 확인)
    const { data: duplicateSupplier, error: duplicateError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', supplierData.name)
      .neq('id', supplierId)
      .maybeSingle();
    
    if (duplicateError) {
      console.error('공급업체 중복 확인 오류:', duplicateError);
      return Response.json({ error: '공급업체 중복 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (duplicateSupplier) {
      return Response.json({ error: '이미 등록된 공급업체명입니다.' }, { status: 400 });
    }

    // 공급업체 수정
    const { data: updatedSupplier, error: updateError } = await supabase
      .from('suppliers')
      .update({
        name: supplierData.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .select('*')
      .single();

    if (updateError) {
      console.error('공급업체 수정 오류:', updateError);
      return Response.json({ error: '공급업체 수정에 실패했습니다.' }, { status: 500 });
    }

    return Response.json(updatedSupplier);
  } catch (error) {
    console.error('공급업체 수정 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 공급업체 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId, supplierId } = await context.params;
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

    // 권한 확인 (admin 또는 owner만 삭제 가능)
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return Response.json({ error: '공급업체를 삭제할 권한이 없습니다.' }, { status: 403 });
    }

    // 기능 활성화 확인
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 이 공급업체를 사용 중인 식재료가 있는지 확인
    const { data: usedIngredients, error: checkError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('supplier_id', supplierId)
      .limit(1);
    
    if (checkError) {
      console.error('식재료 확인 오류:', checkError);
      return Response.json({ error: '공급업체 사용 여부 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 사용 중인 경우 삭제 불가
    if (usedIngredients && usedIngredients.length > 0) {
      return Response.json({ 
        error: '이 공급업체는 현재 식재료에서 사용 중이므로 삭제할 수 없습니다. 먼저 관련 식재료의 공급업체를 변경해주세요.' 
      }, { status: 400 });
    }

    // 공급업체 삭제
    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)
      .eq('company_id', companyId);

    if (deleteError) {
      console.error('공급업체 삭제 오류:', deleteError);
      return Response.json({ error: '공급업체 삭제에 실패했습니다.' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('공급업체 삭제 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 