import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { z } from 'zod';

// 유효성 검사 스키마
const menuDetailsSchema = z.object({
  menu_id: z.string().uuid({ message: '유효한 메뉴 ID가 아닙니다.' }),
  container_id: z.string().uuid({ message: '유효한 용기 ID가 아닙니다.' }).optional().nullable(),
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
  calories?: number;
}

// 메뉴 상세 정보 조회 API
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

    // 기능 활성화 확인 - 'ingredients'로 수정 (feature-flags.ts에 정의된 FeatureName 타입에 맞춤)
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return NextResponse.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // 요청 데이터 파싱
    const requestData = await request.json();
    
    // 데이터 유효성 검사
    const validationResult = menuDetailsSchema.safeParse(requestData);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return NextResponse.json({ error: '입력 데이터가 유효하지 않습니다.', details: errors }, { status: 400 });
    }
    
    const { menu_id, container_id } = validationResult.data;

    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 메뉴 정보 조회
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select(`
        id,
        name,
        description,
        menu_price_history (
          cost_price,
          recorded_at
        ),
        menu_containers (
          id,
          menu_id,
          container_id,
          ingredients_cost
        )
      `)
      .eq('id', menu_id)
      .eq('company_id', companyId)
      .single();

    if (menuError) {
      console.error('메뉴 조회 오류:', menuError);
      return NextResponse.json({ error: '메뉴 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 메뉴의 원가 계산
    let menuCost = 0;
    
    if (container_id && menu.menu_containers) {
      // 현재 메뉴와 용기에 해당하는 원가 정보 찾기
      const menuContainer = menu.menu_containers.find(
        mc => mc.menu_id === menu_id && mc.container_id === container_id
      );
      
      if (menuContainer) {
        // 특정 메뉴-용기 조합에 대한 원가 사용
        menuCost = menuContainer.ingredients_cost || 0;
      } else {
        // 메뉴-용기 조합 정보가 없는 경우 menu_price_history에서 가져옴
        if (menu.menu_price_history && menu.menu_price_history.length > 0) {
          const sortedHistory = [...menu.menu_price_history].sort((a, b) => {
            if (!a.recorded_at || !b.recorded_at) return 0;
            return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
          });
          menuCost = sortedHistory[0].cost_price || 0;
        }
      }
    } else {
      // 용기 ID가 없거나 menu_containers가 없는 경우 menu_price_history에서 가져옴
      if (menu.menu_price_history && menu.menu_price_history.length > 0) {
        const sortedHistory = [...menu.menu_price_history].sort((a, b) => {
          if (!a.recorded_at || !b.recorded_at) return 0;
          return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
        });
        menuCost = sortedHistory[0].cost_price || 0;
      }
    }

    // 용기 정보 조회 (있는 경우)
    let container = null;
    if (container_id) {
      const { data: containerData, error: containerError } = await supabase
        .from('containers')
        .select('id, name, description, price')
        .eq('id', container_id)
        .single();
      
      if (!containerError) {
        container = containerData;
      }
    }

    // 칼로리 계산을 위한 메뉴-용기의 식재료 정보 조회
    let calories = 0;
    if (container_id) {
      // 메뉴-용기 ID 조회
      const { data: menuContainerData, error: menuContainerError } = await supabase
        .from('menu_containers')
        .select('id')
        .eq('menu_id', menu_id)
        .eq('container_id', container_id)
        .single();
      
      if (!menuContainerError && menuContainerData) {
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
              calories
            )
          `)
          .eq('menu_container_id', menuContainerData.id);
        
        if (!ingredientsError && ingredients) {
          // 칼로리 계산
          calories = ingredients.reduce((total, item) => {
            // item.ingredient는 복잡한 구조가 아닌 실제로는 Ingredient 타입의 필드를 가지고 있음
            const ingredient = item.ingredient as unknown as Ingredient;
            
            if (!ingredient || !ingredient.calories) {
              return total;
            }
            
            // 칼로리 계산: 식재료 칼로리/포장단위 * 사용량
            const caloriesPerUnit = ingredient.calories / ingredient.package_amount;
            return total + caloriesPerUnit * item.amount;
          }, 0);
        }
      }
    }

    // 응답에 메뉴 원가(식재료 원가)와 용기 정보를 함께 반환
    // 참고: 클라이언트에서 용기 원가를 계산할 때 같은 용기에 여러 메뉴가 담기는 경우
    // 용기 원가는 한 번만 계산하도록 처리해야 함
    return NextResponse.json({
      menu_id,
      container_id,
      cost: menuCost,
      calories,
      container: container
    });
  } catch (error) {
    console.error('메뉴 상세 정보 조회 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 