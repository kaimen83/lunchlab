import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 재고 요구사항 타입 정의
interface StockRequirement {
  id: string;
  name: string;
  item_type: 'ingredient' | 'container';
  total_amount: number;
  unit: string;
  code_name?: string;
  supplier?: string;
  stock_grade?: string;
  price?: number;
}

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
      code_name?: string;
      supplier?: string;
      supplier_id?: string;
      stock_grade?: string;
    }
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
    const { id: companyId, date } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 1. 해당 날짜의 식수 계획 조회
    const { data: mealPortions, error: portionsError } = await supabase
      .from('meal_portions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date);
    
    if (portionsError) {
      console.error('식수 계획 조회 오류:', portionsError);
      return NextResponse.json(
        { error: '식수 계획을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (!mealPortions || mealPortions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          ingredients: [],
          containers: [],
          message: '해당 날짜의 조리계획서가 없습니다.'
        }
      });
    }
    
    // 2. 식단 정보 조회
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
            menu_containers(
              id,
              menu_id,
              container_id,
              ingredients_cost,
              menu_container_ingredients(
                amount,
                ingredient:ingredients(id, name, package_amount, unit, price, code_name, supplier, supplier_id, stock_grade)
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
        { error: '식단 정보를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 3. 식재료 요구사항 계산 (재고 등급이 있는 것만)
    const ingredientRequirements: Record<string, StockRequirement> = {};
    
    // 4. 용기 요구사항 계산 (모든 용기)
    const containerRequirements: Record<string, StockRequirement> = {};
    
    // 각 식단의 메뉴별 식수 계산
    for (const mealPlan of mealPlans) {
      // 해당 식단의 식수 찾기
      const portion = mealPortions.find(p => p.meal_plan_id === mealPlan.id);
      if (!portion) continue;
      
      const headcount = portion.headcount;
      
      // 각 메뉴별 계산
      for (const mealPlanMenu of mealPlan.meal_plan_menus) {
        const menu = mealPlanMenu.menu;
        const container = mealPlanMenu.container;
        
        // 용기 요구사항 계산
        if (container) {
          if (!containerRequirements[container.id]) {
            containerRequirements[container.id] = {
              id: container.id,
              name: container.name,
              item_type: 'container',
              total_amount: 0,
              unit: '개',
              price: container.price
            };
          }
          containerRequirements[container.id].total_amount += headcount;
        }
        
        // 식재료 요구사항 계산
        const menuContainer = menu.menu_containers?.find((mc: MenuContainer) => 
          mc.menu_id === menu.id && mc.container_id === (container?.id || null)
        );
        
        if (menuContainer && menuContainer.menu_container_ingredients) {
          for (const ingredientItem of menuContainer.menu_container_ingredients) {
            const ingredient = ingredientItem.ingredient;
            
            // 재고 등급이 있는 식재료만 포함
            if (!ingredient.stock_grade) continue;
            
            const amount = ingredientItem.amount * headcount;
            
            if (!ingredientRequirements[ingredient.id]) {
              ingredientRequirements[ingredient.id] = {
                id: ingredient.id,
                name: ingredient.name,
                item_type: 'ingredient',
                total_amount: 0,
                unit: ingredient.unit,
                code_name: ingredient.code_name,
                supplier: ingredient.supplier,
                stock_grade: ingredient.stock_grade,
                price: ingredient.price
              };
            }
            
            ingredientRequirements[ingredient.id].total_amount += amount;
          }
        }
      }
    }
    
    // 5. 공급업체 정보 보완
    const ingredientIds = Object.keys(ingredientRequirements);
    if (ingredientIds.length > 0) {
      const { data: ingredientsDetails, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, supplier, supplier_id')
        .in('id', ingredientIds);
      
      if (!ingredientsError && ingredientsDetails) {
        const supplierIds = ingredientsDetails
          .filter(i => i.supplier_id)
          .map(i => i.supplier_id);
        
        let suppliersMap: Record<string, string> = {};
        
        if (supplierIds.length > 0) {
          const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('id, name')
            .in('id', supplierIds);
          
          if (!suppliersError && suppliers) {
            suppliersMap = suppliers.reduce((map, supplier) => {
              map[supplier.id] = supplier.name;
              return map;
            }, {} as Record<string, string>);
          }
        }
        
        // 공급업체 정보 업데이트
        for (const item of ingredientsDetails) {
          if (ingredientRequirements[item.id]) {
            if (item.supplier_id && suppliersMap[item.supplier_id]) {
              ingredientRequirements[item.id].supplier = suppliersMap[item.supplier_id];
            } else if (item.supplier) {
              ingredientRequirements[item.id].supplier = item.supplier;
            }
          }
        }
      }
    }
    
    // 6. 추가된 식재료와 용기 조회
    const { data: additionalIngredients, error: additionalIngredientsError } = await supabase
      .from('cooking_plan_additional_ingredients')
      .select(`
        id,
        quantity,
        ingredient:ingredients(
          id,
          name,
          unit,
          price,
          package_amount,
          supplier,
          code_name,
          stock_grade
        )
      `)
      .eq('company_id', companyId)
      .eq('date', date);

    const { data: additionalContainers, error: additionalContainersError } = await supabase
      .from('cooking_plan_additional_containers')
      .select(`
        id,
        quantity,
        container:containers(
          id,
          name,
          price,
          code_name,
          description
        )
      `)
      .eq('company_id', companyId)
      .eq('date', date);

    // 추가된 식재료를 결과에 포함
    const additionalIngredientRequirements: StockRequirement[] = [];
    if (!additionalIngredientsError && additionalIngredients) {
      for (const item of additionalIngredients) {
        const ingredient = item.ingredient as any;
        if (ingredient) {
          additionalIngredientRequirements.push({
            id: `additional_ingredient_${ingredient.id}`,
            name: ingredient.name,
            item_type: 'ingredient',
            total_amount: item.quantity,
            unit: ingredient.unit,
            code_name: ingredient.code_name,
            supplier: ingredient.supplier,
            stock_grade: ingredient.stock_grade,
            price: ingredient.price
          });
        }
      }
    }

    // 추가된 용기를 결과에 포함
    const additionalContainerRequirements: StockRequirement[] = [];
    if (!additionalContainersError && additionalContainers) {
      for (const item of additionalContainers) {
        const container = item.container as any;
        if (container) {
          additionalContainerRequirements.push({
            id: `additional_container_${container.id}`,
            name: container.name,
            item_type: 'container',
            total_amount: item.quantity,
            unit: '개',
            code_name: container.code_name,
            price: container.price
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        date,
        ingredients: [...Object.values(ingredientRequirements), ...additionalIngredientRequirements],
        containers: [...Object.values(containerRequirements), ...additionalContainerRequirements]
      }
    });
    
  } catch (error) {
    console.error('조리계획서 재고 요구사항 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 