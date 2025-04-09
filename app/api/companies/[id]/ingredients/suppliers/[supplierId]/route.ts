import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{
    id: string;
    supplierId: string;
  }>;
}

// 유효성 검사 스키마
const supplierSchema = z.object({
  name: z
    .string()
    .min(1, { message: '업체명은 필수입니다.' })
    .max(100, { message: '업체명은 100자 이하여야 합니다.' }),
});

// 특정 공급업체 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, supplierId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 공급업체 정보 조회
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .single();
    
    if (supplierError) {
      console.error('공급업체 조회 오류:', supplierError);
      return NextResponse.json({ error: '공급업체 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(supplier);
  } catch (error) {
    console.error('공급업체 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 공급업체 정보 수정
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, supplierId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name } = body;
    
    // 유효성 검사
    const validationResult = supplierSchema.safeParse({ name });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return NextResponse.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 중복 이름 확인
    const { data: existingSupplier, error: checkError } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name)
      .neq('id', supplierId)
      .maybeSingle();
    
    if (checkError) {
      console.error('공급업체 중복 확인 오류:', checkError);
      return NextResponse.json({ error: '공급업체 중복 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (existingSupplier) {
      return NextResponse.json({ 
        error: '동일한 이름의 공급업체가 이미 존재합니다.' 
      }, { status: 400 });
    }
    
    // 공급업체 정보 업데이트
    const { data: updatedSupplier, error: updateError } = await supabase
      .from('suppliers')
      .update({
        name,
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('공급업체 업데이트 오류:', updateError);
      return NextResponse.json({ error: '공급업체 정보 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error('공급업체 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 공급업체 삭제
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, supplierId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 관리자급 이상인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData || !['owner', 'admin'].includes(membershipData.role)) {
      return NextResponse.json({ error: '공급업체를 삭제할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 식재료 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'ingredients')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '식재료 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 이 공급업체를 사용하는 식재료가 있는지 확인
    const { data: relatedIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('supplier_id', supplierId);
    
    if (ingredientsError) {
      console.error('연관 식재료 조회 오류:', ingredientsError);
      return NextResponse.json({ error: '공급업체 사용 여부 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (relatedIngredients && relatedIngredients.length > 0) {
      return NextResponse.json({ 
        error: '이 공급업체는 하나 이상의 식재료에서 사용 중이므로 삭제할 수 없습니다.'
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
      return NextResponse.json({ error: '공급업체 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '공급업체가 삭제되었습니다.' });
  } catch (error) {
    console.error('공급업체 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 메서드 지원 추가 - PUT 핸들러를 재사용
export const PATCH = PUT; 