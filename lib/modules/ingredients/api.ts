import { v4 as uuidv4 } from 'uuid';
import { ModuleHelpers } from '../module-template';
import {
  Category,
  Ingredient,
  Menu,
  CreateCategoryRequest,
  CreateIngredientRequest,
  CreateMenuRequest,
  IngredientFilter,
  MenuFilter
} from './types';

const MODULE_ID = 'ingredients-module';

/**
 * 카테고리 관련 API 함수
 */
export const CategoryAPI = {
  // 카테고리 목록 조회
  async getCategories(companyId: string, type?: 'ingredient' | 'menu'): Promise<Category[]> {
    try {
      const endpoint = type
        ? `/api/modules/${MODULE_ID}/categories?companyId=${companyId}&type=${type}`
        : `/api/modules/${MODULE_ID}/categories?companyId=${companyId}`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`카테고리 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('카테고리 조회 오류:', error);
      throw error;
    }
  },
  
  // 카테고리 생성
  async createCategory(companyId: string, data: CreateCategoryRequest): Promise<Category> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          id: uuidv4(),
          created_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`카테고리 생성 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'categories.created',
        result
      );
      
      return result;
    } catch (error) {
      console.error('카테고리 생성 오류:', error);
      throw error;
    }
  },
  
  // 카테고리 수정
  async updateCategory(companyId: string, categoryId: string, data: Partial<Category>): Promise<Category> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          updated_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`카테고리 수정 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'categories.updated',
        result
      );
      
      return result;
    } catch (error) {
      console.error('카테고리 수정 오류:', error);
      throw error;
    }
  },
  
  // 카테고리 삭제
  async deleteCategory(companyId: string, categoryId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/categories/${categoryId}?companyId=${companyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`카테고리 삭제 실패: ${response.statusText}`);
      }
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'categories.deleted',
        { id: categoryId }
      );
      
      return true;
    } catch (error) {
      console.error('카테고리 삭제 오류:', error);
      throw error;
    }
  }
};

/**
 * 식재료 관련 API 함수
 */
export const IngredientAPI = {
  // 식재료 목록 조회
  async getIngredients(companyId: string, filter?: IngredientFilter): Promise<Ingredient[]> {
    try {
      let endpoint = `/api/modules/${MODULE_ID}/ingredients?companyId=${companyId}`;
      
      if (filter) {
        const params = new URLSearchParams();
        
        if (filter.name) params.append('name', filter.name);
        if (filter.category_id) params.append('category_id', filter.category_id);
        if (filter.storage_method) params.append('storage_method', filter.storage_method);
        if (filter.allergens && filter.allergens.length > 0) {
          params.append('allergens', filter.allergens.join(','));
        }
        
        endpoint += `&${params.toString()}`;
      }
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`식재료 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('식재료 조회 오류:', error);
      throw error;
    }
  },
  
  // 식재료 상세 조회
  async getIngredient(companyId: string, ingredientId: string): Promise<Ingredient> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/ingredients/${ingredientId}?companyId=${companyId}`);
      
      if (!response.ok) {
        throw new Error(`식재료 상세 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('식재료 상세 조회 오류:', error);
      throw error;
    }
  },
  
  // 식재료 생성
  async createIngredient(companyId: string, data: CreateIngredientRequest): Promise<Ingredient> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          id: uuidv4(),
          created_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`식재료 생성 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'ingredients.created',
        result
      );
      
      return result;
    } catch (error) {
      console.error('식재료 생성 오류:', error);
      throw error;
    }
  },
  
  // 식재료 수정
  async updateIngredient(companyId: string, ingredientId: string, data: Partial<Ingredient>): Promise<Ingredient> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/ingredients/${ingredientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          updated_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`식재료 수정 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'ingredients.updated',
        result
      );
      
      return result;
    } catch (error) {
      console.error('식재료 수정 오류:', error);
      throw error;
    }
  },
  
  // 식재료 삭제
  async deleteIngredient(companyId: string, ingredientId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/ingredients/${ingredientId}?companyId=${companyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`식재료 삭제 실패: ${response.statusText}`);
      }
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'ingredients.deleted',
        { id: ingredientId }
      );
      
      return true;
    } catch (error) {
      console.error('식재료 삭제 오류:', error);
      throw error;
    }
  }
};

/**
 * 메뉴 관련 API 함수
 */
export const MenuAPI = {
  // 메뉴 목록 조회
  async getMenus(companyId: string, filter?: MenuFilter): Promise<Menu[]> {
    try {
      let endpoint = `/api/modules/${MODULE_ID}/menus?companyId=${companyId}`;
      
      if (filter) {
        const params = new URLSearchParams();
        
        if (filter.name) params.append('name', filter.name);
        if (filter.category_id) params.append('category_id', filter.category_id);
        if (filter.difficulty) params.append('difficulty', filter.difficulty);
        if (filter.max_cooking_time) params.append('max_cooking_time', filter.max_cooking_time.toString());
        if (filter.ingredient_ids && filter.ingredient_ids.length > 0) {
          params.append('ingredient_ids', filter.ingredient_ids.join(','));
        }
        
        endpoint += `&${params.toString()}`;
      }
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`메뉴 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('메뉴 조회 오류:', error);
      throw error;
    }
  },
  
  // 메뉴 상세 조회
  async getMenu(companyId: string, menuId: string): Promise<Menu> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/menus/${menuId}?companyId=${companyId}`);
      
      if (!response.ok) {
        throw new Error(`메뉴 상세 조회 실패: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('메뉴 상세 조회 오류:', error);
      throw error;
    }
  },
  
  // 메뉴 생성
  async createMenu(companyId: string, data: CreateMenuRequest): Promise<Menu> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          id: uuidv4(),
          created_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`메뉴 생성 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'menus.created',
        result
      );
      
      return result;
    } catch (error) {
      console.error('메뉴 생성 오류:', error);
      throw error;
    }
  },
  
  // 메뉴 수정
  async updateMenu(companyId: string, menuId: string, data: Partial<Menu>): Promise<Menu> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/menus/${menuId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...data,
          updated_at: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`메뉴 수정 실패: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'menus.updated',
        result
      );
      
      return result;
    } catch (error) {
      console.error('메뉴 수정 오류:', error);
      throw error;
    }
  },
  
  // 메뉴 삭제
  async deleteMenu(companyId: string, menuId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/modules/${MODULE_ID}/menus/${menuId}?companyId=${companyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`메뉴 삭제 실패: ${response.statusText}`);
      }
      
      // 이벤트 발행
      await ModuleHelpers.publishEvent(
        companyId,
        MODULE_ID,
        'menus.deleted',
        { id: menuId }
      );
      
      return true;
    } catch (error) {
      console.error('메뉴 삭제 오류:', error);
      throw error;
    }
  }
}; 