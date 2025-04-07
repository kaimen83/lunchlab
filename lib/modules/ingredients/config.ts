import { ModuleConfig, ModuleLifecycle, registerModule } from '../module-template';

/**
 * 식재료 및 메뉴 입력 모듈 설정
 */
export const ingredientsModuleConfig: ModuleConfig = {
  id: 'ingredients-module',
  name: '식재료 및 메뉴 관리',
  description: '식재료 정보와 메뉴를 등록하고 관리할 수 있는 모듈입니다.',
  icon: 'Utensils',
  category: '기본',
  version: '1.0.0',
  price: 0,
  requires_approval: false,
  
  // 메뉴 아이템 정의
  menuItems: [
    {
      label: '식재료/메뉴',
      icon: 'Utensils',
      path: '/modules/ingredients',
      display_order: 1,
    },
    {
      label: '식재료 관리',
      icon: 'Apple',
      path: '/modules/ingredients/ingredients',
      parent_id: 'ingredients-module',
      display_order: 1,
    },
    {
      label: '메뉴 관리',
      icon: 'UtensilsCrossed',
      path: '/modules/ingredients/menus',
      parent_id: 'ingredients-module',
      display_order: 2,
    },
    {
      label: '카테고리 관리',
      icon: 'Tags',
      path: '/modules/ingredients/categories',
      parent_id: 'ingredients-module',
      permission: 'ingredients.categories.manage',
      display_order: 3,
    }
  ],
  
  // 권한 정의
  permissions: [
    {
      name: 'ingredients.view',
      description: '식재료 조회 권한',
      default_roles: ['owner', 'admin', 'member'],
    },
    {
      name: 'ingredients.edit',
      description: '식재료 편집 권한',
      default_roles: ['owner', 'admin'],
    },
    {
      name: 'menus.view',
      description: '메뉴 조회 권한',
      default_roles: ['owner', 'admin', 'member'],
    },
    {
      name: 'menus.edit',
      description: '메뉴 편집 권한',
      default_roles: ['owner', 'admin'],
    },
    {
      name: 'ingredients.categories.manage',
      description: '카테고리 관리 권한',
      default_roles: ['owner', 'admin'],
    }
  ],
  
  // 데이터 스키마 정의
  dataSchemas: [
    {
      name: 'ingredients',
      description: '식재료 정보 스키마',
      is_shared: true,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category_id: { type: 'string' },
          unit: { type: 'string' },
          price_per_unit: { type: 'number' },
          calories_per_unit: { type: 'number' },
          allergens: { type: 'array', items: { type: 'string' } },
          nutrition_info: {
            type: 'object',
            properties: {
              carbs: { type: 'number' },
              protein: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' }
            }
          },
          storage_method: { type: 'string', enum: ['냉장', '냉동', '실온'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'category_id', 'unit', 'created_at'],
      },
      caching_strategy: {
        strategy: 'hybrid',
        ttl_seconds: 300,
        invalidate_on_events: [
          'ingredients.created', 
          'ingredients.updated',
          'ingredients.deleted'
        ],
      },
    },
    {
      name: 'menus',
      description: '메뉴 정보 스키마',
      is_shared: true,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          category_id: { type: 'string' },
          description: { type: 'string' },
          recipe: { type: 'string' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredient_id: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' }
              },
              required: ['ingredient_id', 'quantity']
            }
          },
          cooking_time: { type: 'number' }, // 분 단위
          difficulty: { type: 'string', enum: ['쉬움', '보통', '어려움'] },
          image_url: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'category_id', 'created_at'],
      },
      caching_strategy: {
        strategy: 'hybrid',
        ttl_seconds: 300,
        invalidate_on_events: [
          'menus.created', 
          'menus.updated', 
          'menus.deleted'
        ],
      },
    },
    {
      name: 'categories',
      description: '식재료 및 메뉴 카테고리 스키마',
      is_shared: true,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['ingredient', 'menu'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'type', 'created_at'],
      },
      caching_strategy: {
        strategy: 'hybrid',
        ttl_seconds: 600,
        invalidate_on_events: [
          'categories.created', 
          'categories.updated', 
          'categories.deleted'
        ],
      },
    }
  ],
  
  // 이벤트 타입 정의
  eventTypes: [
    'ingredients.created',
    'ingredients.updated',
    'ingredients.deleted',
    'menus.created',
    'menus.updated',
    'menus.deleted',
    'categories.created',
    'categories.updated',
    'categories.deleted',
  ],
  
  // 이벤트 구독 정의
  eventSubscriptions: [],
};

/**
 * 식재료 모듈 라이프사이클 핸들러
 */
export const ingredientsModuleLifecycle: ModuleLifecycle = {
  onInstall: async (companyId: string) => {
    console.log(`식재료 모듈이 회사(${companyId})에 설치되었습니다.`);
    
    // 기본 카테고리 생성 (실제 구현에서는 API 호출)
    const defaultCategories = [
      // 식재료 카테고리
      { name: '육류', type: 'ingredient' },
      { name: '해산물', type: 'ingredient' },
      { name: '채소', type: 'ingredient' },
      { name: '과일', type: 'ingredient' },
      { name: '곡물', type: 'ingredient' },
      { name: '유제품', type: 'ingredient' },
      { name: '조미료', type: 'ingredient' },
      { name: '기타', type: 'ingredient' },
      
      // 메뉴 카테고리
      { name: '메인요리', type: 'menu' },
      { name: '반찬', type: 'menu' },
      { name: '국/찌개', type: 'menu' },
      { name: '디저트', type: 'menu' },
      { name: '음료', type: 'menu' },
    ];
    
    console.log('기본 카테고리가 생성되었습니다.');
  },
  
  onUninstall: async (companyId: string) => {
    console.log(`식재료 모듈이 회사(${companyId})에서 제거되었습니다.`);
  },
};

/**
 * 식재료 모듈을 등록하는 함수
 */
export async function registerIngredientsModule() {
  try {
    const result = await registerModule(ingredientsModuleConfig);
    console.log('식재료 모듈이 성공적으로 등록되었습니다:', result);
    return result;
  } catch (error) {
    console.error('식재료 모듈 등록 오류:', error);
    throw error;
  }
} 