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
  container_type: 'group' | 'item';
  parent_container_id?: string | null;
  sort_order?: number;
  children?: Container[];
  level?: number;
  path?: string;
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
  menuId: string | null;
  containerId: string;
}

// 복수 메뉴 선택 지원을 위한 타입 추가
export interface MenuContainerSelectionsMap {
  [containerId: string]: string[];
} 