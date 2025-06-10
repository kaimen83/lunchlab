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
      supplier?: string;
      supplier_id?: string;
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
    return notFound();
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
      return notFound();
    }
    
    if (!mealPortions || mealPortions.length === 0) {
      console.error('해당 날짜의 조리계획서가 없습니다:', date);
      return notFound();
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
                ingredient:ingredients(id, name, package_amount, unit, price, code_name, supplier, supplier_id)
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
      return notFound();
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
                unit_price: ingredient.price,
                total_price: 0,
                package_amount: ingredient.package_amount,
                code_name: ingredient.code_name,
                supplier: ingredient.supplier
              };
            }
            
            ingredientRequirements[ingredient.id].total_amount += amount;
          }
        }
      }
    }
    
    // 식재료 코드명과 공급업체 정보 가져오기
    const ingredientIds = Object.keys(ingredientRequirements);
    if (ingredientIds.length > 0) {
      // 식재료 상세 정보 조회
      const { data: ingredientsDetails, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, code_name, supplier, supplier_id')
        .in('id', ingredientIds);
      
      if (!ingredientsError && ingredientsDetails) {
        // 공급업체 ID 목록 추출
        const supplierIds = ingredientsDetails
          .filter(i => i.supplier_id)
          .map(i => i.supplier_id);
        
        // 공급업체 정보 조회
        let suppliersMap: Record<string, string> = {};
        
        if (supplierIds.length > 0) {
          const { data: suppliers, error: suppliersError } = await supabase
            .from('suppliers')
            .select('id, name')
            .in('id', supplierIds);
          
          if (!suppliersError && suppliers) {
            // 공급업체 ID를 키로 하는 맵 생성
            suppliersMap = suppliers.reduce((map, supplier) => {
              map[supplier.id] = supplier.name;
              return map;
            }, {} as Record<string, string>);
          }
        }
        
        // 식재료 요구사항에 코드명과 공급업체 정보 추가
        for (const item of ingredientsDetails) {
          if (ingredientRequirements[item.id]) {
            // 코드명 추가
            ingredientRequirements[item.id].code_name = item.code_name;
            
            // 공급업체 정보 추가 (우선순위: 매핑된 공급업체명 > 직접 입력된 공급업체명)
            if (item.supplier_id && suppliersMap[item.supplier_id]) {
              ingredientRequirements[item.id].supplier = suppliersMap[item.supplier_id];
            } else if (item.supplier) {
              ingredientRequirements[item.id].supplier = item.supplier;
            }
          }
        }
      }
    }
    
    // 각 식재료별 총 가격 계산
    Object.keys(ingredientRequirements).forEach(id => {
      const item = ingredientRequirements[id];
      // package_amount가 있는 경우에만 패키지 단위로 계산
      if (item.package_amount && item.package_amount > 0) {
        // 필요한 포장 개수 계산 (올림 처리 대신 부동 소수점으로 계산)
        const packages = item.total_amount / item.package_amount;
        // 총 가격 = 필요한 포장 개수 * 포장단위 가격
        item.total_price = packages * item.unit_price;
      } else {
        // 포장단위 정보가 없는 경우, 예상치를 계산할 수 없으므로 0으로 처리
        item.total_price = 0;
      }
    });
    
    // 4. 재고 정보 조회 및 매칭
    const stockReferenceDate = new Date().toISOString();
    
    // 식재료 재고 정보 조회
    if (ingredientIds.length > 0) {
      const { data: ingredientStocks, error: ingredientStockError } = await supabase
        .from('stock_items')
        .select('item_id, current_quantity, unit, last_updated')
        .eq('company_id', companyId)
        .eq('item_type', 'ingredient')
        .in('item_id', ingredientIds);
      
      if (!ingredientStockError && ingredientStocks) {
        // 식재료 요구사항에 재고 정보 추가
        for (const stock of ingredientStocks) {
          if (ingredientRequirements[stock.item_id]) {
            ingredientRequirements[stock.item_id].current_stock = stock.current_quantity;
            ingredientRequirements[stock.item_id].stock_updated_at = stock.last_updated;
          }
        }
      }
    }
    
    // 용기 재고 정보 조회를 위한 용기 ID 수집
    const containerIds = [...new Set(menuPortions
      .filter(portion => portion.container_id)
      .map(portion => portion.container_id!)
    )];
    
    // 용기 재고 정보 조회 - 상위 그룹의 재고량을 표시하도록 수정
    let containerStocks: any[] = [];
    if (containerIds.length > 0) {
      // 1. 먼저 용기 정보를 조회하여 parent_container_id 확인
      const { data: containerInfo, error: containerInfoError } = await supabase
        .from('containers')
        .select('id, parent_container_id, container_type')
        .in('id', containerIds);
      
      if (!containerInfoError && containerInfo) {
        // 2. 각 용기별로 재고를 조회할 대상 ID 결정
        const stockQueries = new Map<string, string>(); // original_id -> stock_target_id
        
        for (const container of containerInfo) {
          // parent가 있는 경우 parent의 재고를, 없는 경우 자신의 재고를 조회
          const targetId = container.parent_container_id || container.id;
          stockQueries.set(container.id, targetId);
        }
        
        // 3. 실제 재고를 조회할 ID 목록 (중복 제거)
        const stockTargetIds = [...new Set(stockQueries.values())];
        
        // 4. 재고 정보 조회
        const { data: stockData, error: stockError } = await supabase
          .from('stock_items')
          .select('item_id, current_quantity, unit, last_updated')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', stockTargetIds);
        
        if (!stockError && stockData) {
          // 5. 재고 데이터를 원래 용기 ID 기준으로 매핑
          const stockMap = new Map<string, any>();
          for (const stock of stockData) {
            stockMap.set(stock.item_id, stock);
          }
          
          // 6. 결과 데이터 구성 (original container_id를 기준으로)
          containerStocks = containerIds.map(containerId => {
            const targetId = stockQueries.get(containerId);
            const stockInfo = targetId ? stockMap.get(targetId) : null;
            
            return {
              item_id: containerId, // 원래 용기 ID 유지
              current_quantity: stockInfo?.current_quantity || 0,
              unit: stockInfo?.unit || '개',
              last_updated: stockInfo?.last_updated || null,
              // 추가 정보: 어떤 그룹의 재고인지 표시
              stock_source_id: targetId,
              is_group_stock: targetId !== containerId
            };
          }).filter(stock => stock !== null);
        }
      }
    }
    
    // 5. 발주량 정보 조회 및 추가
    if (ingredientIds.length > 0) {
      const { data: orderQuantities, error: orderQuantitiesError } = await supabase
        .from('order_quantities')
        .select('ingredient_id, order_quantity')
        .eq('company_id', companyId)
        .eq('date', date)
        .in('ingredient_id', ingredientIds);
      
      if (!orderQuantitiesError && orderQuantities) {
        // 식재료 요구사항에 발주량 정보 추가
        for (const orderQty of orderQuantities) {
          if (ingredientRequirements[orderQty.ingredient_id]) {
            ingredientRequirements[orderQty.ingredient_id].order_quantity = orderQty.order_quantity;
          }
        }
      }
    }
    
    // 결과 데이터 구성
    const cookingPlan: CookingPlan = {
      date,
      meal_portions: mealPortions,
      meal_plans: mealPlans,
      menu_portions: menuPortions,
      ingredient_requirements: Object.values(ingredientRequirements),
      stock_reference_date: stockReferenceDate
    };
    
    return (
      <div className="flex flex-col h-full w-full bg-gray-50">
        {/* 페이지 헤더 - 인쇄 시 숨김 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm print:hidden">
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
        
        {/* 페이지 콘텐츠 - 인쇄 시 최적화 */}
        <main className="flex-1 overflow-y-auto py-6 print:py-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:px-0 print:max-w-none">
            <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:rounded-none print:p-4">
              <CookingPlanClientWrapper cookingPlan={cookingPlan} containerStocks={containerStocks} companyId={companyId} />
            </div>
          </div>
        </main>
      </div>
    );
    
  } catch (error) {
    console.error('조리계획서 조회 오류:', error);
    return notFound();
  }
} 