import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CookingPlan, IngredientRequirement, MenuPortion } from '../types';
import CookingPlanClientWrapper from './CookingPlanClientWrapper';

export const metadata: Metadata = {
  title: '조리계획서 상세 - LunchLab',
  description: '조리계획서 상세 정보'
};

// 메뉴 컨테이너 타입 정의 (API route에서 복사)
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
    }
  }>;
}

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CookingPlanDetailPageProps {
  params: Promise<{
    id: string;
    date: string;
  }>;
}

export default async function CookingPlanDetailPage({ params }: CookingPlanDetailPageProps) {
  // Next.js 15에서는 params가 Promise이므로 await로 처리
  const { id: companyId, date } = await params;
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사 정보 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (companyError || !company) {
    notFound();
  }
  
  // 현재 사용자가 회사의 멤버인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  
  // 멤버가 아니라면 접근 불가
  if (membershipError || !membership) {
    redirect('/');
  }
  
  try {
    // API 호출 대신 Supabase로 직접 데이터를 조회합니다

    // 1. 해당 날짜의 식수 계획 조회
    const { data: mealPortions, error: portionsError } = await supabase
      .from('meal_portions')
      .select('*')
      .eq('company_id', companyId)
      .eq('date', date);
    
    if (portionsError) {
      console.error('식수 계획 조회 오류:', portionsError);
      notFound();
    }
    
    if (!mealPortions || mealPortions.length === 0) {
      console.error('해당 날짜의 조리계획서가 없습니다:', date);
      notFound();
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
            menu_price_history(cost_price, recorded_at),
            menu_containers(
              id,
              menu_id,
              container_id,
              ingredients_cost,
              container:containers(id, name),
              menu_container_ingredients(
                amount,
                ingredient:ingredients(id, name, package_amount, unit, price, code_name)
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
      notFound();
    }
    
    // 3. 결과 데이터 구성
    const menuPortions: MenuPortion[] = [];
    
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
                package_amount: ingredient.package_amount,
                code_name: ingredient.code_name
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
    
    // 결과 데이터 구성
    const cookingPlan: CookingPlan = {
      date,
      meal_portions: mealPortions,
      meal_plans: mealPlans,
      menu_portions: menuPortions,
      ingredient_requirements: Object.values(ingredientRequirements)
    };
    
    return (
      <div className="flex flex-col h-full w-full bg-gray-50">
        {/* 페이지 헤더 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">조리계획서</h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" size="sm" className="rounded-md shadow-sm hover:bg-gray-100" asChild>
                  <Link href={`/companies/${companyId}/cooking-plans`}>
                    목록으로 돌아가기
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow p-6">
              <CookingPlanClientWrapper cookingPlan={cookingPlan} />
            </div>
          </div>
        </main>
      </div>
    );
    
  } catch (error) {
    console.error('조리계획서 조회 오류:', error);
    notFound();
  }
} 