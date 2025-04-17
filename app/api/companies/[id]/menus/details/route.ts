import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const containerDetailsSchema = z.object({
  container_id: z.string().uuid({ message: '유효한 용기 ID가 아닙니다.' }),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 식재료 타입 정의
interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  calories?: number;
}

// 메뉴 컨테이너 상세 정보 조회 API
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const session = await auth();
    
    if (!session || !session.userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const userId = session.userId;

    // 회사 정보 조회
    const company = await getServerCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 멤버십 확인
    const membership = await getUserMembership({ userId, companyId });
    if (!membership) {
      return NextResponse.json({ error: '이 회사에 접근할 권한이 없습니다.' }, { status: 403 });
    }

    // 기능 활성화 확인
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return NextResponse.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    
    // 데이터 유효성 검사
    const validationResult = containerDetailsSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return NextResponse.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const { container_id } = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 컨테이너 정보 조회
    const { data: containerData, error: containerError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        menu_id,
        container_id,
        ingredients_cost,
        container:containers (
          id,
          name,
          description,
          price
        )
      `)
      .eq('id', container_id)
      .single();

    if (containerError) {
      console.error('컨테이너 조회 오류:', containerError);
      return NextResponse.json({ error: '컨테이너 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 식재료 정보 조회
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('menu_container_ingredients')
      .select(`
        id,
        ingredient_id,
        amount,
        ingredient:ingredients (
          id,
          name,
          package_amount,
          unit,
          price,
          calories
        )
      `)
      .eq('menu_container_id', container_id);
    
    if (ingredientsError) {
      console.error('식재료 조회 오류:', ingredientsError);
      return NextResponse.json({ error: '식재료 정보를 조회하는데 실패했습니다.' }, { status: 500 });
    }

    // 총 원가 계산 (식재료 원가)
    const ingredientsCost = ingredients.reduce((total, item) => {
      const ingredient = item.ingredient as unknown as Ingredient;
      if (!ingredient) return total;
      
      const unitPrice = ingredient.price / ingredient.package_amount;
      return total + (unitPrice * item.amount);
    }, 0);

    // 칼로리 계산
    const calories = ingredients.reduce((total, item) => {
      const ingredient = item.ingredient as unknown as Ingredient;
      if (!ingredient || !ingredient.calories) return total;
      
      const caloriesPerUnit = ingredient.calories / ingredient.package_amount;
      return total + (caloriesPerUnit * item.amount);
    }, 0);

    // 용기 가격 (참고용)
    const containerPrice = containerData.container?.price || 0;

    // 총 가격 (식재료 원가 + 용기 가격)
    const totalCost = ingredientsCost + containerPrice;

    return NextResponse.json({
      id: containerData.id,
      menu_id: containerData.menu_id,
      container_id: containerData.container_id,
      container: containerData.container,
      ingredients_cost: ingredientsCost,
      container_price: containerPrice,
      total_cost: totalCost,
      calories,
      ingredients
    });
  } catch (error) {
    console.error('메뉴 컨테이너 상세 정보 조회 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 