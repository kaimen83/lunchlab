/**
 * 식재료 모듈용 타입 정의
 */

// 카테고리 타입
export type CategoryType = 'ingredient' | 'menu';

// 카테고리 정보
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  created_at: string;
  updated_at?: string;
}

// 영양 정보
export interface NutritionInfo {
  carbs?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
}

// 저장 방법
export type StorageMethod = '냉장' | '냉동' | '실온';

// 식재료 정보
export interface Ingredient {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  price_per_unit?: number;
  calories_per_unit?: number;
  allergens?: string[];
  nutrition_info?: NutritionInfo;
  storage_method?: StorageMethod;
  created_at: string;
  updated_at?: string;
}

// 메뉴에 사용되는 식재료 
export interface MenuIngredient {
  ingredient_id: string;
  quantity: number;
  unit?: string;
}

// 요리 난이도
export type DifficultyLevel = '쉬움' | '보통' | '어려움';

// 메뉴 정보
export interface Menu {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  recipe?: string;
  ingredients?: MenuIngredient[];
  cooking_time?: number; // 분 단위
  difficulty?: DifficultyLevel;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

// 식재료 필터 옵션
export interface IngredientFilter {
  name?: string;
  category_id?: string;
  allergens?: string[];
  storage_method?: StorageMethod;
}

// 메뉴 필터 옵션
export interface MenuFilter {
  name?: string;
  category_id?: string;
  difficulty?: DifficultyLevel;
  max_cooking_time?: number;
  ingredient_ids?: string[];
}

// 식재료 생성 요청
export interface CreateIngredientRequest {
  name: string;
  category_id: string;
  unit: string;
  price_per_unit?: number;
  calories_per_unit?: number;
  allergens?: string[];
  nutrition_info?: NutritionInfo;
  storage_method?: StorageMethod;
}

// 메뉴 생성 요청
export interface CreateMenuRequest {
  name: string;
  category_id: string;
  description?: string;
  recipe?: string;
  ingredients?: MenuIngredient[];
  cooking_time?: number;
  difficulty?: DifficultyLevel;
  image_url?: string;
}

// 카테고리 생성 요청
export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
} 