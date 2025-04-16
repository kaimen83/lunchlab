import { MealPlan } from './types';
import { format } from 'date-fns';

// 식사 시간대 한글 이름
export const getMealTimeName = (mealTime: 'breakfast' | 'lunch' | 'dinner'): string => {
  switch (mealTime) {
    case 'breakfast':
      return '아침';
    case 'lunch':
      return '점심';
    case 'dinner':
      return '저녁';
    default:
      return mealTime;
  }
};

// 식단 총 원가 계산 함수
export const calculateMealPlanCost = (mealPlan: MealPlan): number => {
  if (!mealPlan.meal_plan_menus) {
    return 0;
  }
  
  return mealPlan.meal_plan_menus.reduce((totalCost, item) => {
    let itemCost = 0;
    
    // 용기 ID 확인
    const containerId = item.container_id;
    
    if (containerId && item.menu.menu_containers) {
      // 현재 메뉴와 용기에 해당하는 원가 정보 찾기
      const menuContainer = item.menu.menu_containers.find(
        mc => mc.menu_id === item.menu_id && mc.container_id === containerId
      );
      
      if (menuContainer && menuContainer.ingredients_cost > 0) {
        // 특정 메뉴-용기 조합에 대한 원가 사용
        itemCost = menuContainer.ingredients_cost;
      } else {
        // 메뉴-용기 조합 정보가 없거나 원가가 0인 경우 (비호환 메뉴) menu_price_history에서 가져옴
        if (item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
          const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
            if (!a.recorded_at || !b.recorded_at) return 0;
            return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
          });
          const latestPrice = sortedHistory[0].cost_price;
          itemCost = typeof latestPrice === 'number' ? latestPrice : 0;
        }
      }
    } else {
      // 용기 ID가 없거나 menu_containers가 없는 경우 menu_price_history에서 가져옴
      if (item.menu && item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
        const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
          if (!a.recorded_at || !b.recorded_at) return 0;
          return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
        });
        
        const latestPrice = sortedHistory[0].cost_price;
        itemCost = typeof latestPrice === 'number' ? latestPrice : 0;
      }
    }
    
    return totalCost + itemCost;
  }, 0);
};

// 식단에 포함된 메뉴 이름 렌더링
export const getMenuNames = (mealPlan: MealPlan): string => {
  if (!mealPlan.meal_plan_menus || mealPlan.meal_plan_menus.length === 0) {
    return '메뉴 없음';
  }
  
  const menuNames = mealPlan.meal_plan_menus.map(item => item.menu.name);
  if (menuNames.length <= 2) {
    return menuNames.join(', ');
  }
  return `${menuNames[0]}, ${menuNames[1]} 외 ${menuNames.length - 2}개`;
};

// 통화 형식 변환 함수
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', { 
    style: 'currency', 
    currency: 'KRW',
    maximumFractionDigits: 1
  }).format(amount);
};

// 날짜별 식단 필터링
export const getMealPlansByDate = (mealPlans: MealPlan[], date: Date, mealTime?: 'breakfast' | 'lunch' | 'dinner'): MealPlan[] => {
  const dateString = format(date, 'yyyy-MM-dd');
  return mealPlans.filter(
    (plan) => plan.date === dateString && (!mealTime || plan.meal_time === mealTime)
  );
}; 