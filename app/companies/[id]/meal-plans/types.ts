export interface MealPlanMenu {
  id: string;
  meal_plan_id: string;
  menu_id: string;
  container_id?: string | null;
  menu: {
    id: string;
    name: string;
    description: string | null;
    menu_price_history: {
      cost_price: number;
      recorded_at?: string;
    }[];
    menu_containers?: {
      id: string;
      menu_id: string;
      container_id: string;
      ingredients_cost: number;
    }[];
  };
  container?: {
    id: string;
    name: string;
    description: string | null;
    price: number;
  } | null;
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