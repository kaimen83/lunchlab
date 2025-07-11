import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const ingredientSchema = z.object({
  id: z.string().optional(), // PUT 메서드에서 필요
  name: z
    .string()
    .min(1, { message: '식재료 이름은 필수입니다.' })
    .max(100, { message: '식재료 이름은 100자 이하여야 합니다.' }),
  code_name: z
    .string()
    .max(100, { message: '코드명은 100자 이하여야 합니다.' })
    .optional()
    .nullable(),
  supplier: z
    .string()
    .max(100, { message: '식재료 업체는 100자 이하여야 합니다.' })
    .optional()
    .nullable(),
  supplier_id: z
    .string()
    .optional()
    .nullable(),
  package_amount: z
    .number()
    .min(0.1, { message: '포장량은 0.1 이상이어야 합니다.' }),
  unit: z
    .string()
    .min(1, { message: '단위는 필수입니다.' }),
  price: z
    .number()
    .min(0, { message: '가격은 0 이상이어야 합니다.' }),
  items_per_box: z
    .number()
    .min(0, { message: '박스당 갯수는 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  stock_grade: z
    .string()
    .optional()
    .nullable(),
  memo1: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional()
    .nullable(),
  origin: z
    .string()
    .max(100, { message: '원산지는 100자 이하여야 합니다.' })
    .optional()
    .nullable(),
  calories: z
    .number()
    .min(0, { message: '칼로리는 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  protein: z
    .number()
    .min(0, { message: '단백질은 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  fat: z
    .number()
    .min(0, { message: '지방은 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  carbs: z
    .number()
    .min(0, { message: '탄수화물은 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  allergens: z
    .string()
    .max(200, { message: '알러지 유발물질은 200자 이하여야 합니다.' })
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

    // URL 쿼리 파라미터 파싱
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const search = url.searchParams.get('search') || '';
    const detailed = url.searchParams.get('detailed') === 'true';
    const sortField = url.searchParams.get('sort') || 'name';
    const sortDirection = url.searchParams.get('direction') || 'asc';
    
    // 정렬 가능한 필드 검증
    const validSortFields = [
      'name', 'code_name', 'supplier', 'package_amount', 'price', 
      'items_per_box', 'stock_grade', 'origin', 'calories', 'created_at'
    ];
    
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'name';
    const finalSortDirection = ['asc', 'desc'].includes(sortDirection) ? sortDirection : 'asc';
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 기본 필드와 상세 필드 정의
    const basicFields = 'id, name, code_name, supplier, supplier_id, package_amount, unit, price, items_per_box, stock_grade';
    const detailedFields = 'origin, memo1, calories, protein, fat, carbs, allergens, created_at, updated_at';
    
    // 조회할 필드 결정
    const fields = detailed ? `${basicFields}, ${detailedFields}` : basicFields;

    // Promise.all을 사용하여 전체 개수와 페이지 데이터를 병렬로 가져옴
    const [countResult, dataResult] = await Promise.all([
      // 전체 식재료 개수 조회 (검색어가 있는 경우 식재료명과 코드명 모두에서 검색)
      (search 
        ? supabase
            .from('ingredients')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .or(`name.ilike.%${search}%,code_name.ilike.%${search}%`)
        : supabase
            .from('ingredients')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
      ),
      
      // 한글 정렬을 위한 PostgreSQL 함수 사용
      supabase.rpc('get_ingredients_with_korean_sort', {
        p_company_id: companyId,
        p_search: search,
        p_sort_field: finalSortField,
        p_sort_direction: finalSortDirection,
        p_limit: limit,
        p_offset: offset
      })
    ]);

    const { count, error: countError } = countResult;
    const { data: ingredients, error: dataError } = dataResult;

    if (countError) {
      console.error('식재료 개수 조회 오류:', countError);
      return Response.json({ error: '식재료 개수를 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (dataError) {
      console.error('식재료 목록 조회 오류:', dataError);
      return Response.json({ error: '식재료 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 결과 반환 (페이지네이션 정보 포함)
    return Response.json({
      ingredients: ingredients || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('식재료 목록 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 추가
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
        code_name: ingredient.code_name || null,
        supplier: ingredient.supplier || null,
        supplier_id: ingredient.supplier_id || null,
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        items_per_box: ingredient.items_per_box || null,
        stock_grade: ingredient.stock_grade || null,
        memo1: ingredient.memo1 || null,
        origin: ingredient.origin || null,
        calories: ingredient.calories || null,
        protein: ingredient.protein || null,
        fat: ingredient.fat || null,
        carbs: ingredient.carbs || null,
        allergens: ingredient.allergens || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('식재료 추가 오류:', error);
      
      // 유니크 제약조건 위반 오류 (중복 코드명) 처리
      if (error.code === '23505' && error.message?.includes('unique_company_code_name')) {
        return Response.json({ 
          error: '코드명 중복 오류',
          message: '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.',
          code: 'DUPLICATE_CODE_NAME',
          details: error.message
        }, { status: 409 });
      }
      
      return Response.json({ error: '식재료 추가에 실패했습니다.' }, { status: 500 });
    }

    // 가격 이력 추가
    const { error: historyError } = await supabase
      .from('ingredient_price_history')
      .insert({
        ingredient_id: data.id,
        price: ingredient.price,
        recorded_at: new Date().toISOString()
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

// 식재료 수정
export async function PUT(request: NextRequest, context: RouteContext) {
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

    // 식재료 수정
    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: ingredient.name,
        code_name: ingredient.code_name || null,
        supplier: ingredient.supplier || null,
        supplier_id: ingredient.supplier_id || null,
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        items_per_box: ingredient.items_per_box || null,
        stock_grade: ingredient.stock_grade || null,
        memo1: ingredient.memo1 || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ingredient.id)
      .select('*')
      .single();

    if (error) {
      console.error('식재료 수정 오류:', error);
      
      // 유니크 제약조건 위반 오류 (중복 코드명) 처리
      if (error.code === '23505' && error.message?.includes('unique_company_code_name')) {
        return Response.json({ 
          error: '코드명 중복 오류',
          message: '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.',
          code: 'DUPLICATE_CODE_NAME',
          details: error.message
        }, { status: 409 });
      }
      
      return Response.json({ error: '식재료 수정에 실패했습니다.' }, { status: 500 });
    }

    // 가격 이력 추가
    const { error: historyError } = await supabase
      .from('ingredient_price_history')
      .insert({
        ingredient_id: data.id,
        price: ingredient.price,
        recorded_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('가격 이력 추가 오류:', historyError);
      // 이력 추가 실패는 심각한 오류가 아니므로 계속 진행
    }

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error('식재료 수정 API 오류:', error);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 