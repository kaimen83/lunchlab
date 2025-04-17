import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 식재료 요구사항 타입 정의
interface IngredientRequirement {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  total_amount: number;
  unit_price: number;
  total_price: number;
  package_amount: number;
}

// 조리계획서 생성 요청 스키마
const cookingPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD).'),
  meal_portions: z.array(
    z.object({
      meal_plan_id: z.string().uuid('유효한 식단 ID가 아닙니다.'),
      headcount: z.number().int().min(1, '식수는 최소 1명 이상이어야 합니다.')
    })
  ).min(1, '최소 하나 이상의 식단을 선택해야 합니다.')
});

// 메뉴 컨테이너 타입 정의
interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  ingredients_cost: number;
  menu_container_ingredients: Array<{
    amount: number;
    ingredient: {
      id: string;
      name: string;
      package_amount: number;
      unit: string;
      price: number;
    }
  }>;
}

// GET: 조리계획서 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createServerSupabaseClient();
    
    // date 파라미터가 없고 startDate, endDate가 있는 경우: 목록 조회
    if (!date && (startDate || endDate)) {
      let query = supabase
        .from('meal_portions')
        .select(`
          id,
          date,
          headcount,
          meal_plan_id,
          meal_plans:meal_plans!meal_plan_id(
            id,
            name,
            meal_time
          )
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false });
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data: portions, error } = await query;
      
      if (error) {
        console.error('조리계획서 목록 조회 오류:', error);
        return NextResponse.json(
          { error: '조리계획서 목록을 조회하는데 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 날짜별로 그룹화
      const dateGroups: Record<string, any> = {};
      portions?.forEach(portion => {
        if (!dateGroups[portion.date]) {
          dateGroups[portion.date] = {
            date: portion.date,
            meal_times: new Set(),
            total_headcount: 0,
          };
        }
        
        // 식사 시간 추가 (meal_plans가 있는 경우)
        if (portion.meal_plans && portion.meal_plans.meal_time) {
          dateGroups[portion.date].meal_times.add(portion.meal_plans.meal_time);
        }
        
        // 총 식수 누적
        dateGroups[portion.date].total_headcount += portion.headcount;
      });
      
      // Set을 배열로 변환
      const result = Object.values(dateGroups).map(group => ({
        ...group,
        meal_times: Array.from(group.meal_times as Set<string>)
      }));
      
      return NextResponse.json(result);
    }
    
    // date 파라미터가 없는 경우 (그리고 startDate, endDate도 없는 경우): 오류 반환
    if (!date) {
      return NextResponse.json(
        { error: '날짜 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 해당 날짜의 식수 계획 조회
    const { data: mealPortions, error: portionsError } = await supabase
      .from('meal_portions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date);
    
    if (portionsError) {
      console.error('식수 계획 조회 오류:', portionsError);
      return NextResponse.json(
        { error: '식수 계획을 조회하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    if (!mealPortions || mealPortions.length === 0) {
      return NextResponse.json(
        { error: '해당 날짜의 조리계획서가 없습니다.' },
        { status: 404 }
      );
    }
    
    // 식단 정보 조회
    const mealPlanIds = [...new Set(mealPortions.map(portion => portion.meal_plan_id))];
    
    const { data: mealPlans, error: mealPlansError } = await supabase
      .from('meal_plans')
      .select(`
        *,
        meal_plan_menus(
          *,
          menu:menus(
            id,
            name,
            description,
            menu_price_history(cost_price, recorded_at),
            menu_containers(
              id,
              menu_id,
              container_id,
              ingredients_cost,
              container:containers(id, name),
              menu_container_ingredients(
                amount,
                ingredient:ingredients(id, name, package_amount, unit, price)
              )
            )
          ),
          container:containers(
            id,
            name,
            description,
            price
          )
        )
      `)
      .in('id', mealPlanIds)
      .order('meal_time');
    
    if (mealPlansError) {
      console.error('식단 정보 조회 오류:', mealPlansError);
      return NextResponse.json(
        { error: '식단 정보를 조회하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 결과 데이터 구성
    const menuPortions: {
      menu_id: string;
      menu_name: string;
      headcount: number;
      container_id: string | null;
      container_name: string | null;
      meal_time: string;  // 식사 시간 정보 추가
      meal_plan_id: string; // 식단 ID 추가
    }[] = [];
    
    // 식재료 요구사항 맵
    const ingredientRequirements: Record<string, IngredientRequirement> = {};
    
    // 각 식단의 메뉴별 식수 계산
    for (const mealPlan of mealPlans) {
      // 해당 식단의 식수 찾기
      const portion = mealPortions.find(p => p.meal_plan_id === mealPlan.id);
      if (!portion) continue;
      
      const headcount = portion.headcount;
      
      // 각 메뉴별 식수 계산
      for (const mealPlanMenu of mealPlan.meal_plan_menus) {
        const menu = mealPlanMenu.menu;
        const container = mealPlanMenu.container;
        
        // 메뉴별 식수 추가 (식사 시간 정보와 식단 ID 추가)
        menuPortions.push({
          menu_id: menu.id,
          menu_name: menu.name,
          headcount,
          container_id: container?.id || null,
          container_name: container?.name || null,
          meal_time: mealPlan.meal_time || '기타', // 식사 시간 정보가 없을 경우 '기타'로 지정
          meal_plan_id: mealPlan.id      // 식단 ID 추가
        });
        
        // 각 메뉴의 식재료 계산
        // 해당 메뉴-용기 조합에 맞는 컨테이너 찾기
        const menuContainer = menu.menu_containers?.find((mc: MenuContainer) => 
          mc.menu_id === menu.id && mc.container_id === (container?.id || null)
        );
        
        if (menuContainer && menuContainer.menu_container_ingredients) {
          // 각 식재료별 필요량 계산
          for (const ingredientItem of menuContainer.menu_container_ingredients) {
            const ingredient = ingredientItem.ingredient;
            const amount = ingredientItem.amount * headcount;
            
            // 식재료 요구사항 누적
            if (!ingredientRequirements[ingredient.id]) {
              ingredientRequirements[ingredient.id] = {
                ingredient_id: ingredient.id,
                ingredient_name: ingredient.name,
                unit: ingredient.unit,
                total_amount: 0,
                unit_price: ingredient.price / ingredient.package_amount,
                total_price: 0,
                package_amount: ingredient.package_amount
              };
            }
            
            ingredientRequirements[ingredient.id].total_amount += amount;
          }
        }
      }
    }
    
    // 각 식재료별 총 가격 계산
    Object.keys(ingredientRequirements).forEach(id => {
      const item = ingredientRequirements[id];
      item.total_price = item.total_amount * item.unit_price;
    });
    
    // 결과 반환
    return NextResponse.json({
      date,
      meal_portions: mealPortions,
      meal_plans: mealPlans,
      menu_portions: menuPortions,
      ingredient_requirements: Object.values(ingredientRequirements)
    });
    
  } catch (error) {
    console.error('조리계획서 조회 오류:', error);
    return NextResponse.json(
      { error: '조리계획서를 조회하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 조리계획서 생성
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    // 요청 데이터 파싱 및 유효성 검사
    const requestBody = await request.json();
    const validationResult = cookingPlanSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { error: '입력 데이터가 유효하지 않습니다.', details: errors },
        { status: 400 }
      );
    }
    
    const { date, meal_portions } = validationResult.data;
    
    const supabase = createServerSupabaseClient();
    
    // 기존 데이터 확인 (같은 날짜, 같은 식단에 대한 식수 계획이 있는지)
    const mealPlanIds = meal_portions.map(item => item.meal_plan_id);
    
    const { data: existingPortions, error: checkError } = await supabase
      .from('meal_portions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date)
      .in('meal_plan_id', mealPlanIds);
    
    if (checkError) {
      console.error('기존 식수 계획 확인 오류:', checkError);
      return NextResponse.json(
        { error: '식수 계획을 확인하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 트랜잭션 시작
    const { error: deleteError } = await supabase
      .from('meal_portions')
      .delete()
      .eq('company_id', companyId)
      .eq('date', date)
      .in('meal_plan_id', mealPlanIds);
    
    if (deleteError) {
      console.error('기존 식수 계획 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '기존 식수 계획을 삭제하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 새 식수 계획 등록
    const portionsToInsert = meal_portions.map(item => ({
      company_id: companyId,
      date,
      meal_plan_id: item.meal_plan_id,
      headcount: item.headcount,
      created_by: userId
    }));
    
    const { data: insertedPortions, error: insertError } = await supabase
      .from('meal_portions')
      .insert(portionsToInsert)
      .select();
    
    if (insertError) {
      console.error('식수 계획 등록 오류:', insertError);
      return NextResponse.json(
        { error: '식수 계획을 등록하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    // 조리계획서 조회를 위한 리다이렉트 URL
    const redirectUrl = `/api/companies/${companyId}/cooking-plans?date=${date}`;
    
    return NextResponse.json(
      { message: '조리계획서가 생성되었습니다.', portions: insertedPortions },
      { 
        status: 201,
        headers: {
          'Location': redirectUrl
        }
      }
    );
    
  } catch (error) {
    console.error('조리계획서 생성 오류:', error);
    return NextResponse.json(
      { error: '조리계획서를 생성하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 조리계획서 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: '날짜 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '해당 회사에 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 관리자 또는 소유자만 삭제 가능
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: '조리계획서를 삭제할 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 해당 날짜의 식수 계획 삭제
    const { error: deleteError } = await supabase
      .from('meal_portions')
      .delete()
      .eq('company_id', companyId)
      .eq('date', date);
    
    if (deleteError) {
      console.error('조리계획서 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '조리계획서를 삭제하는데 실패했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: '조리계획서가 성공적으로 삭제되었습니다.' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('조리계획서 삭제 오류:', error);
    return NextResponse.json(
      { error: '조리계획서를 삭제하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 조리계획서 수정
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    // 요청 본문 파싱
    const body = await request.json();
    
    // 요청 데이터 검증
    const validationResult = cookingPlanSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      return NextResponse.json(
        { 
          error: '유효하지 않은 요청 데이터입니다.',
          details: errors
        },
        { status: 400 }
      );
    }
    
    const { date, meal_portions } = validationResult.data;
    
    const supabase = createServerSupabaseClient();
    
    // 회사 소속 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    try {
      // 기존 조리계획서 조회
      const { data: existingMealPortions, error: existingError } = await supabase
        .from('meal_portions')
        .select('*')
        .eq('company_id', companyId)
        .eq('date', date);
      
      if (existingError) {
        console.error('기존 조리계획서 조회 오류:', existingError);
        return NextResponse.json(
          { error: '기존 조리계획서 조회에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 기존 데이터가 없으면 오류 반환
      if (!existingMealPortions || existingMealPortions.length === 0) {
        return NextResponse.json(
          { error: '수정할 조리계획서가 존재하지 않습니다.' },
          { status: 404 }
        );
      }
      
      // 기존 조리계획서 삭제
      const { error: deleteError } = await supabase
        .from('meal_portions')
        .delete()
        .eq('company_id', companyId)
        .eq('date', date);
      
      if (deleteError) {
        console.error('기존 조리계획서 삭제 오류:', deleteError);
        return NextResponse.json(
          { error: '기존 조리계획서 삭제에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      // 새 조리계획서 데이터 생성
      const newPortions = meal_portions.map(portion => ({
        company_id: companyId,
        date,
        meal_plan_id: portion.meal_plan_id,
        headcount: portion.headcount,
        created_by: userId
      }));
      
      // 새 조리계획서 저장
      const { error: insertError } = await supabase
        .from('meal_portions')
        .insert(newPortions);
      
      if (insertError) {
        console.error('새 조리계획서 저장 오류:', insertError);
        return NextResponse.json(
          { error: '새 조리계획서 저장에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ success: true, date });
    } catch (error) {
      console.error('조리계획서 수정 오류:', error);
      return NextResponse.json(
        { error: '조리계획서 수정에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('조리계획서 수정 핸들러 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 