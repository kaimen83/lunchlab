import { createServerSupabaseClient } from '@/lib/supabase';

// 식재료 타입 정의
interface Ingredient {
  id: string;
  name: string;
  price: number;
  package_amount: number;
}

/**
 * 식재료 가격 변경 시 해당 식재료를 사용하는 모든 메뉴 컨테이너의 원가를 업데이트하는 함수
 * @param ingredientId 식재료 ID
 * @param oldPrice 이전 식재료 가격
 * @param newPrice 새 식재료 가격
 * @param packageAmount 식재료 포장량
 * @returns 업데이트된 메뉴 컨테이너 정보
 */
export async function updateMenuContainersForIngredient(
  ingredientId: string,
  oldPrice: number,
  newPrice: number,
  packageAmount: number
) {
  try {
    // 가격이 변경되지 않은 경우 처리하지 않음
    if (oldPrice === newPrice) {
      return {
        success: true,
        updated: 0,
        message: '가격 변경이 없어 업데이트가 필요하지 않습니다.'
      };
    }

    const supabase = createServerSupabaseClient();
    
    // 이 식재료를 사용하는 모든 menu_container_ingredients 조회
    const { data: ingredientUsages, error: usageError } = await supabase
      .from('menu_container_ingredients')
      .select(`
        id,
        menu_container_id,
        amount
      `)
      .eq('ingredient_id', ingredientId);
    
    if (usageError) {
      console.error('식재료 사용 정보 조회 오류:', usageError);
      return {
        success: false,
        error: '식재료 사용 정보 조회 중 오류가 발생했습니다.'
      };
    }
    
    if (!ingredientUsages || ingredientUsages.length === 0) {
      return {
        success: true,
        updated: 0,
        message: '이 식재료를 사용하는 메뉴 컨테이너가 없습니다.'
      };
    }
    
    // 영향을 받는 메뉴 컨테이너 ID 목록
    const affectedMenuContainerIds = [...new Set(ingredientUsages.map(item => item.menu_container_id))];
    
    // 업데이트된 메뉴 ID를 추적하기 위한 Set
    const updatedMenuIds = new Set<string>();
    
    // 각 메뉴 컨테이너의 원가 업데이트
    const updateResults = await Promise.all(
      affectedMenuContainerIds.map(async (menuContainerId) => {
        try {
          // 메뉴 컨테이너 정보 조회
          const { data: menuContainer, error: containerError } = await supabase
            .from('menu_containers')
            .select(`
              id,
              menu_id,
              container_id,
              ingredients_cost
            `)
            .eq('id', menuContainerId)
            .single();
          
          if (containerError) {
            console.error(`메뉴 컨테이너 정보 조회 오류 (${menuContainerId}):`, containerError);
            return {
              id: menuContainerId,
              success: false,
              error: '메뉴 컨테이너 정보 조회 실패'
            };
          }
          
          // 해당 메뉴 컨테이너의 모든 식재료 사용량 조회
          const { data: containerIngredients, error: ingredientsError } = await supabase
            .from('menu_container_ingredients')
            .select(`
              id,
              ingredient_id,
              amount,
              ingredient:ingredients(id, name, price, package_amount)
            `)
            .eq('menu_container_id', menuContainerId);
          
          if (ingredientsError) {
            console.error(`메뉴 컨테이너 식재료 조회 오류 (${menuContainerId}):`, ingredientsError);
            return {
              id: menuContainerId,
              success: false,
              error: '메뉴 컨테이너 식재료 조회 실패'
            };
          }
          
          // 원가 계산
          const ingredientsCost = (containerIngredients || []).reduce((total, item) => {
            if (!item.ingredient) return total;
            
            // 현재 식재료인 경우 새 가격 사용
            if (item.ingredient_id === ingredientId) {
              const unitPrice = newPrice / packageAmount;
              return total + (unitPrice * item.amount);
            } else {
              // 다른 식재료는 기존 가격 사용
              const ingredient = item.ingredient as unknown as Ingredient;
              const unitPrice = ingredient.price / ingredient.package_amount;
              return total + (unitPrice * item.amount);
            }
          }, 0);
          
          // 소수점 첫째 자리까지 반올림
          const roundedCost = parseFloat(ingredientsCost.toFixed(1));
          
          // 원가 업데이트
          const { error: updateError } = await supabase
            .from('menu_containers')
            .update({
              ingredients_cost: roundedCost
            })
            .eq('id', menuContainerId);
          
          if (updateError) {
            console.error(`메뉴 컨테이너 원가 업데이트 오류 (${menuContainerId}):`, updateError);
            return {
              id: menuContainerId,
              success: false,
              error: '메뉴 컨테이너 원가 업데이트 실패'
            };
          }
          
          // 업데이트 성공한 메뉴 ID 추가
          if (menuContainer.menu_id) {
            updatedMenuIds.add(menuContainer.menu_id);
          }
          
          return {
            id: menuContainerId,
            menu_id: menuContainer.menu_id,
            old_cost: menuContainer.ingredients_cost,
            new_cost: roundedCost,
            difference: roundedCost - (menuContainer.ingredients_cost || 0),
            success: true
          };
        } catch (error) {
          console.error(`메뉴 컨테이너 업데이트 중 오류 (${menuContainerId}):`, error);
          return {
            id: menuContainerId,
            success: false,
            error: '처리 중 오류 발생'
          };
        }
      })
    );
    
    // 각 메뉴의 총 원가 업데이트
    await Promise.all(
      Array.from(updatedMenuIds).map(async (menuId) => {
        // 해당 메뉴의 모든 컨테이너 원가 조회
        const { data: menuContainerCosts, error: menuContainerCostsError } = await supabase
          .from('menu_containers')
          .select('ingredients_cost')
          .eq('menu_id', menuId);
        
        if (menuContainerCostsError) {
          console.error(`메뉴 컨테이너 원가 조회 오류 (${menuId}):`, menuContainerCostsError);
          return;
        }
        
        // 총 원가 계산
        const totalCost = (menuContainerCosts || []).reduce(
          (sum, item) => sum + (item.ingredients_cost || 0),
          0
        );
        
        // 메뉴 원가 업데이트
        await supabase
          .from('menus')
          .update({
            cost_price: parseFloat(totalCost.toFixed(1)),
            updated_at: new Date().toISOString()
          })
          .eq('id', menuId);
        
        // 가격 이력 기록
        await supabase
          .from('menu_price_history')
          .insert({
            menu_id: menuId,
            cost_price: parseFloat(totalCost.toFixed(1)),
            recorded_at: new Date().toISOString()
          });
      })
    );
    
    const successCount = updateResults.filter(result => result.success).length;
    
    return {
      success: true,
      updated: successCount,
      menuIds: Array.from(updatedMenuIds),
      details: updateResults
    };
  } catch (error) {
    console.error('메뉴 컨테이너 원가 업데이트 중 오류 발생:', error);
    return {
      success: false,
      error: '원가 업데이트 처리 중 오류가 발생했습니다.'
    };
  }
} 