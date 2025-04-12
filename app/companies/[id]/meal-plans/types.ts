export interface MealPlanMenu {
  id: string;
  meal_plan_id: string;
  menu_id: string;
  menu: {
    id: string;
    name: string;
    description: string | null;
    cost_price: number;
  };
}

export interface MealPlan {
  id: string;
  company_id: string;
  name: string;
  date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  created_at: string;
  updated_at: string;
  meal_plan_menus: MealPlanMenu[];
}

export type FormMode = 'create' | 'edit';
export type ViewType = 'week' | 'month'; 