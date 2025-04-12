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
    
    // 메뉴 비용 계산 - menu_price_history에서 가장 최근 가격 가져오기
    if (item.menu && item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
      // 가장 최근 가격 기록 사용 (배열의 첫 번째 요소)
      const latestPrice = item.menu.menu_price_history[0].cost_price;
      itemCost += typeof latestPrice === 'number' ? latestPrice : 0;
    }
    
    // 용기 비용 추가하지 않음 (원가에서 제외)
    // if (item.container && typeof item.container.price === 'number') {
    //   itemCost += item.container.price;
    // }
    
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
    maximumFractionDigits: 0
  }).format(amount);
};

// 날짜별 식단 필터링
export const getMealPlansByDate = (mealPlans: MealPlan[], date: Date, mealTime?: 'breakfast' | 'lunch' | 'dinner'): MealPlan[] => {
  const dateString = format(date, 'yyyy-MM-dd');
  return mealPlans.filter(
    (plan) => plan.date === dateString && (!mealTime || plan.meal_time === mealTime)
  );
}; 