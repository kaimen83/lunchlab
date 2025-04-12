export interface Menu {
  id: string;
  name: string;
  description: string | null;
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
}

export interface MenuSelectionWithContainer {
  menuId: string;
  containerId: string;
} 