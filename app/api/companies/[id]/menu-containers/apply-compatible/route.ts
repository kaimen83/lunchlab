import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 요청 검증 스키마
const requestSchema = z.object({
  menuId: z.string(),
  targetContainerId: z.string(),
  sourceContainerId: z.string(),
});

// 호환 용기의 식재료 정보를 다른 용기에 적용
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.', details: validation.error.format() }, { status: 400 });
    }
    
    const { menuId, targetContainerId, sourceContainerId } = validation.data;
    
    const supabase = createServerSupabaseClient();
    
    // 1. 사용자가 회사의 멤버인지 확인
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
    
    // 2. 소스 메뉴-용기 조합 조회 (식재료 정보를 가져올 용기)
    const { data: sourceMenuContainer, error: sourceMenuContainerError } = await supabase
      .from('menu_containers')
      .select('id')
      .eq('menu_id', menuId)
      .eq('container_id', sourceContainerId)
      .single();
    
    if (sourceMenuContainerError || !sourceMenuContainer) {
      console.error('소스 메뉴-용기 조합 조회 오류:', sourceMenuContainerError);
      return NextResponse.json({ error: '소스 메뉴-용기 조합을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 3. 타겟 메뉴-용기 조합이 있는지 확인
    const { data: targetMenuContainer, error: targetMenuContainerError } = await supabase
      .from('menu_containers')
      .select('id')
      .eq('menu_id', menuId)
      .eq('container_id', targetContainerId);
    
    let targetMenuContainerId;
    
    // 타겟 메뉴-용기 조합이 없으면 생성
    if (targetMenuContainerError || !targetMenuContainer || targetMenuContainer.length === 0) {
      // 먼저 메뉴와 용기가 해당 회사에 속하는지 확인
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .select('id')
        .eq('id', menuId)
        .eq('company_id', companyId)
        .single();
      
      if (menuError || !menuData) {
        console.error('메뉴 접근 권한 확인 오류:', menuError);
        return NextResponse.json({ error: '해당 메뉴에 접근 권한이 없습니다.' }, { status: 403 });
      }
      
      const { data: containerData, error: containerError } = await supabase
        .from('containers')
        .select('id')
        .eq('id', targetContainerId)
        .eq('company_id', companyId)
        .single();
      
      if (containerError || !containerData) {
        console.error('용기 접근 권한 확인 오류:', containerError);
        return NextResponse.json({ error: '해당 용기에 접근 권한이 없습니다.' }, { status: 403 });
      }
      
      // menu_containers 테이블의 정확한 스키마 확인
      const { data: newMenuContainer, error: createError } = await supabase
        .from('menu_containers')
        .insert({
          menu_id: menuId,
          container_id: targetContainerId
          // company_id 필드가 없으므로 제거
        })
        .select('id')
        .single();
      
      if (createError || !newMenuContainer) {
        console.error('메뉴-용기 조합 생성 오류:', createError);
        return NextResponse.json({ error: '메뉴-용기 조합을 생성하는데 실패했습니다.' }, { status: 500 });
      }
      
      targetMenuContainerId = newMenuContainer.id;
    } else {
      targetMenuContainerId = targetMenuContainer[0].id;
      
      // 기존 타겟의 식재료 정보 삭제
      const { error: deleteError } = await supabase
        .from('menu_container_ingredients')
        .delete()
        .eq('menu_container_id', targetMenuContainerId);
      
      if (deleteError) {
        console.error('기존 식재료 정보 삭제 오류:', deleteError);
        return NextResponse.json({ error: '기존 식재료 정보를 삭제하는데 실패했습니다.' }, { status: 500 });
      }
    }
    
    // 4. 메뉴 칼로리 정보 가져오기 (있다면)
    const { data: menuData, error: menuError } = await supabase
      .from('menus')
      .select('calories, base_calories')
      .eq('id', menuId)
      .single();
    
    // 5. 소스 메뉴-용기의 식재료 정보 조회
    const { data: sourceIngredients, error: sourceIngredientsError } = await supabase
      .from('menu_container_ingredients')
      .select(`
        id, 
        ingredient_id, 
        amount, 
        ingredient:ingredients(id, name, price, package_amount, unit, calories)
      `)
      .eq('menu_container_id', sourceMenuContainer.id);
    
    if (sourceIngredientsError) {
      console.error('소스 식재료 정보 조회 오류:', sourceIngredientsError);
      return NextResponse.json({ error: '소스 식재료 정보를 조회하는데 실패했습니다.' }, { status: 500 });
    }
    
    // 6. 소스의 식재료 정보를 타겟에 적용
    if (sourceIngredients && sourceIngredients.length > 0) {
      // 새로운 식재료 정보 생성 (소스에서 복사)
      const newIngredients = sourceIngredients.map(ingredient => ({
        menu_container_id: targetMenuContainerId,
        ingredient_id: ingredient.ingredient_id,
        amount: ingredient.amount
      }));
      
      const { error: insertError } = await supabase
        .from('menu_container_ingredients')
        .insert(newIngredients);
      
      if (insertError) {
        console.error('식재료 정보 적용 오류:', insertError);
        return NextResponse.json({ error: '식재료 정보를 적용하는데 실패했습니다.' }, { status: 500 });
      }
    }
    
    // 7. 메뉴-용기 조합의 칼로리와 원가 정보 계산
    let totalCalories = 0;
    let ingredientsCost = 0;
    
    // 식재료 기반 칼로리 및 원가 계산
    sourceIngredients?.forEach(item => {
      if (item.ingredient) {
        const ingredient = item.ingredient as any;
        
        // 원가 계산
        if (ingredient.price && ingredient.package_amount) {
          const unitPrice = ingredient.price / ingredient.package_amount;
          ingredientsCost += (unitPrice * item.amount);
        }
        
        // 칼로리 계산
        if (ingredient.calories) {
          const unitCalories = ingredient.calories / ingredient.package_amount;
          totalCalories += (unitCalories * item.amount);
        }
      }
    });
    
    // 기본 칼로리 추가 (메뉴에 기본 칼로리가 설정되어 있는 경우)
    if (menuData && menuData.base_calories) {
      totalCalories += menuData.base_calories;
    }
    
    // menu_containers 테이블 업데이트를 안전하게 시도
    try {
      // 안전하게 업데이트하기 위해 기존 레코드 조회
      const { data: existingRecord, error: getError } = await supabase
        .from('menu_containers')
        .select('*')
        .eq('id', targetMenuContainerId)
        .single();
      
      if (getError) {
        console.error('메뉴-용기 정보 조회 오류:', getError);
      } else if (existingRecord) {
        // 존재하는 필드만 업데이트하기 위해 객체를 생성
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString()
        };
        
        // Object.keys를 사용해 실제 테이블에 있는 필드만 업데이트
        if ('calories' in existingRecord) {
          updateData.calories = totalCalories;
        }
        
        if ('cost' in existingRecord) {
          updateData.cost = ingredientsCost;
        } else if ('total_cost' in existingRecord) {
          updateData.total_cost = ingredientsCost;
        }
        
        if (Object.keys(updateData).length > 1) { // updated_at만 있는 경우 제외
          const { error: updateError } = await supabase
            .from('menu_containers')
            .update(updateData)
            .eq('id', targetMenuContainerId);
          
          if (updateError) {
            console.error('메뉴-용기 정보 업데이트 오류:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('메뉴-용기 정보 업데이트 중 오류:', error);
      // 업데이트 오류는 무시하고 진행 (필수 기능이 아니므로)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '호환 용기의 식재료 정보가 성공적으로 적용되었습니다.',
      targetMenuContainerId,
      calories: totalCalories,
      cost: ingredientsCost
    });
    
  } catch (error) {
    console.error('호환 용기 정보 적용 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 