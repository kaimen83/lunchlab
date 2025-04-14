import { MealPlan, MealPlanMenu } from '../meal-plans/types';

// 식수 계획 타입
export interface MealPortion {
  id?: string;
  date: string;
  meal_plan_id: string;
  headcount: number;
  created_at?: string;
  updated_at?: string;
}

// 메뉴별 식수 계산 결과
export interface MenuPortion {
  menu_id: string;
  menu_name: string;
  headcount: number;
  container_id?: string | null;
  container_name?: string | null;
  meal_time?: string;
  meal_plan_id?: string;
}

// 식재료별 필요량 계산 결과
export interface IngredientRequirement {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  total_amount: number;
  unit_price: number;
  total_price: number;
}

// 조리계획서 전체 타입
export interface CookingPlan {
  date: string;
  meal_portions: MealPortion[];
  meal_plans: MealPlan[];
  menu_portions: MenuPortion[];
  ingredient_requirements: IngredientRequirement[];
}

// 조리계획서 입력 폼 데이터
export interface CookingPlanFormData {
  date: string;
  meal_portions: {
    meal_plan_id: string;
    headcount: number;
  }[];
} 