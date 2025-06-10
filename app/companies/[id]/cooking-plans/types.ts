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
  package_amount?: number;
  code_name?: string;
  supplier?: string;
  current_stock?: number;
  stock_updated_at?: string;
  order_quantity?: number; // 저장된 발주량
}

// 용기별 필요량 계산 결과
export interface ContainerRequirement {
  container_id: string;
  container_name: string;
  code_name?: string;
  needed_quantity: number; // 필요한 용기 수량
  price?: number; // 용기 단가
  total_price: number; // 총 비용
  current_stock?: number;
  stock_updated_at?: string;
}

// 조리계획서 전체 타입
export interface CookingPlan {
  date: string;
  meal_portions: MealPortion[];
  meal_plans: MealPlan[];
  menu_portions: MenuPortion[];
  ingredient_requirements: IngredientRequirement[];
  stock_reference_date?: string;
}

// 확장된 조리계획서 타입 (용기 요구사항 포함)
export interface ExtendedCookingPlan extends Omit<CookingPlan, 'ingredient_requirements'> {
  ingredient_requirements: IngredientRequirement[];
  container_requirements: ContainerRequirement[];
}

// 조리계획서 입력 폼 데이터
export interface CookingPlanFormData {
  date: string;
  meal_portions: {
    meal_plan_id: string;
    headcount: number;
  }[];
} 