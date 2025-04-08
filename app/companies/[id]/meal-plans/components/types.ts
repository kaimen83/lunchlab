// 메뉴 타입 정의
export interface Menu {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  description?: string;
}

// 식단 계획 타입 정의
export interface MealPlan {
  id?: string;
  date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  menu_id: string;
  menu_name?: string;
  quantity: number;
  note?: string;
} 