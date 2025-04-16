export interface Menu {
  id: string;
  name: string;
  description: string | null;
  menu_price_history?: {
    cost_price: number;
    recorded_at?: string;
  }[];
}

export interface Container {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  menu: Menu;
  container: Container;
  ingredients_cost: number;
  container_price: number;
  total_cost: number;
  calories?: number;
}

export interface MenuSelectionWithContainer {
  menuId: string;
  containerId: string;
} 