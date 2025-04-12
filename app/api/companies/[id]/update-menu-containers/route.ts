import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 타입 정의 추가
interface Ingredient {
  id: string;
  name: string;
  price: number;
  package_amount: number;
}

// menu_containers 테이블의 원가 정보를 업데이트하는 API
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
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
      return NextResponse.json({ error: '원가 업데이트 권한이 없습니다.' }, { status: 403 });
    }
    
    // menu_containers 테이블에서 원가가 0이거나 null인 항목 조회
    const { data: menuContainers, error: menuContainersError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        menu_id,
        container_id,
        ingredients_cost
      `)
      .or('ingredients_cost.is.null,ingredients_cost.eq.0')
      .order('menu_id');
    
    if (menuContainersError) {
      console.error('메뉴-용기 조회 오류:', menuContainersError);
      return NextResponse.json({ error: '원가 정보 없는 메뉴-용기 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!menuContainers || menuContainers.length === 0) {
      return NextResponse.json({ 
        message: '업데이트할 메뉴-용기 정보가 없습니다.',
        updated: 0 
      });
    }
    
    // 각 메뉴-용기 조합의 원가 계산 및 업데이트
    const updates = await Promise.all(
      menuContainers.map(async (menuContainer) => {
        try {
          // 해당 메뉴-용기 조합의 식재료 조회
          const { data: ingredients, error: ingredientsError } = await supabase
            .from('menu_container_ingredients')
            .select(`
              id,
              ingredient_id,
              amount,
              ingredient:ingredients(id, name, price, package_amount)
            `)
            .eq('menu_container_id', menuContainer.id);
          
          if (ingredientsError) {
            console.error(`식재료 조회 오류 (${menuContainer.id}):`, ingredientsError);
            return { 
              id: menuContainer.id,
              success: false, 
              error: '식재료 정보 조회 실패' 
            };
          }
          
          // 식재료 원가 계산
          const ingredientsCost = (ingredients || []).reduce((total, item) => {
            if (!item.ingredient) return total;
            
            const ingredient = item.ingredient as unknown as Ingredient;
            const unitPrice = ingredient.price / ingredient.package_amount;
            return total + (unitPrice * item.amount);
          }, 0);
          
          if (ingredientsCost === 0) {
            return { 
              id: menuContainer.id,
              menu_id: menuContainer.menu_id,
              success: false, 
              message: '계산된 원가가 0입니다. 식재료 정보를 확인하세요.' 
            };
          }
          
          // 원가 업데이트
          const { error: updateError } = await supabase
            .from('menu_containers')
            .update({ 
              ingredients_cost: ingredientsCost 
            })
            .eq('id', menuContainer.id);
          
          if (updateError) {
            console.error(`메뉴-용기 원가 업데이트 오류 (${menuContainer.id}):`, updateError);
            return { 
              id: menuContainer.id,
              success: false, 
              error: '원가 업데이트 실패' 
            };
          }
          
          return { 
            id: menuContainer.id,
            menu_id: menuContainer.menu_id,
            container_id: menuContainer.container_id,
            ingredients_cost: ingredientsCost,
            success: true 
          };
        } catch (err) {
          console.error(`메뉴-용기 처리 중 오류 (${menuContainer.id}):`, err);
          return { 
            id: menuContainer.id,
            success: false, 
            error: '처리 중 오류 발생' 
          };
        }
      })
    );
    
    // 메뉴별로 원가 히스토리 업데이트
    const updatedMenuIds = [...new Set(
      updates
        .filter(update => update.success && update.menu_id)
        .map(update => update.menu_id)
    )];
    
    // 각 메뉴에 대해 총 원가 계산 및 menu_price_history 업데이트
    for (const menuId of updatedMenuIds) {
      // 해당 메뉴의 모든 컨테이너 원가 조회
      const { data: menuContainerCosts, error: menuContainerCostsError } = await supabase
        .from('menu_containers')
        .select('ingredients_cost')
        .eq('menu_id', menuId);
      
      if (menuContainerCostsError) {
        console.error(`메뉴 컨테이너 원가 조회 오류 (${menuId}):`, menuContainerCostsError);
        continue;
      }
      
      // 총 원가 계산
      const totalCost = menuContainerCosts.reduce(
        (sum, item) => sum + (item.ingredients_cost || 0), 
        0
      );
      
      if (totalCost > 0) {
        // 메뉴 원가 업데이트
        await supabase
          .from('menus')
          .update({ 
            cost_price: Math.round(totalCost),
            updated_at: new Date().toISOString()
          })
          .eq('id', menuId);
        
        // 가격 이력 기록
        await supabase
          .from('menu_price_history')
          .insert({
            menu_id: menuId,
            cost_price: Math.round(totalCost),
            recorded_at: new Date().toISOString()
          });
      }
    }
    
    const successCount = updates.filter(update => update.success).length;
    
    return NextResponse.json({
      message: `${successCount}개의 메뉴-용기 원가 정보가 업데이트되었습니다.`,
      updated: successCount,
      total: menuContainers.length,
      details: updates
    });
    
  } catch (error) {
    console.error('원가 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '원가 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 