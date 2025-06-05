// 식재료 관련 타입 정의

export interface Ingredient {
  id: string;
  company_id?: string;
  name: string;
  code_name?: string;
  supplier?: string;
  supplier_id?: string;
  package_amount: number;
  unit: string;
  price: number;
  items_per_box?: number;
  pac_count?: number;
  stock_grade?: string;
  memo1?: string;
  memo2?: string;
  origin?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  allergens?: string;
  created_at: string;
  updated_at?: string;
}

// 페이지네이션 정보 인터페이스
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 컴포넌트 Props 타입
export interface IngredientsListProps {
  companyId: string;
  userRole: string;
}

// 검색 입력 컴포넌트 Props
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  totalCount?: number;
}

// 모바일 테이블 컴포넌트 Props
export interface MobileTableProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  searchQuery: string;
  isOwnerOrAdmin: boolean;
  handleAddIngredient: () => void;
  handleEditIngredient: (ingredient: Ingredient) => void;
  handleViewPriceHistory: (ingredient: Ingredient) => void;
  handleDeleteConfirm: (ingredient: Ingredient) => void;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  selectedIngredients: string[];
  handleToggleSelect: (ingredientId: string) => void;
}

// 칼럼 가시성 상태 타입
export interface VisibleColumns {
  name: boolean;
  code_name: boolean;
  supplier: boolean;
  package_amount: boolean;
  price: boolean;
  items_per_box: boolean;
  stock_grade: boolean;
  origin: boolean;
  calories: boolean;
  nutrition: boolean;
  allergens: boolean;
} 