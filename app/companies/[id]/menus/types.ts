/**
 * 메뉴와 관련된 타입 정의
 */

// 식재료 인터페이스
export interface Ingredient {
  id: string;
  ingredient_id: string;
  amount: number;
  ingredient: {
    id: string;
    name: string;
    package_amount: number;
    unit: string;
    price: number;
  };
}

// 용기 인터페이스
export interface Container {
  id: string;
  container: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
  };
  ingredients: Ingredient[];
  ingredients_cost: number;
  total_cost: number;
}

// 메뉴 인터페이스
export interface Menu {
  id: string;
  name: string;
  cost_price: number;
  description?: string;
  recipe?: string;
  created_at: string;
  updated_at?: string;
  containers?: Container[];
}

// 메뉴 목록 컴포넌트 Props 인터페이스
export interface MenusListProps {
  companyId: string;
  userRole: string;
}

// 컨테이너 상세 정보 응답 인터페이스
export interface ContainerDetailsResponse {
  id: string;
  menu_id: string;
  container_id: string;
  container: {
    id: string;
    name: string;
    description: string | null;
    price: number;
  };
  ingredients_cost: number;
  container_price: number;
  total_cost: number;
  calories: number;
  ingredients: any[];
}

// 메뉴 카드 Props 인터페이스
export interface MenuCardProps {
  menu: Menu;
  expandedMenuId: string | null;
  expandedContainers: string[];
  containerDetails: Record<string, ContainerDetailsResponse>;
  loadingContainers: Record<string, boolean>;
  isOwnerOrAdmin: boolean;
  onAccordionToggle: (menuId: string | null) => void;
  onContainerExpand: (containerId: string) => void;
  onViewIngredients: (menu: Menu) => void;
  onEditMenu: (menu: Menu) => void;
  onDeleteConfirm: (menu: Menu) => void;
  formatCurrency: (amount: number) => string;
}

// 컨테이너 카드 Props 인터페이스
export interface ContainerCardProps {
  container: Container;
  expandedContainers: string[];
  containerDetails: Record<string, ContainerDetailsResponse>;
  isLoading: boolean;
  onContainerExpand: (containerId: string) => void;
  formatCurrency: (amount: number) => string;
}

// 상위 식재료 항목 인터페이스
export interface TopIngredient {
  name: string;
  cost: number;
} 