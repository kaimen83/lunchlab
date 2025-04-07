import { ModuleConfig, ModuleLifecycle, registerModule } from './module-template';

/**
 * 예제 모듈 설정
 */
export const exampleModuleConfig: ModuleConfig = {
  id: 'example-module',
  name: '예제 모듈',
  description: '모듈 개발을 위한 예제 모듈입니다.',
  icon: 'Lab',
  category: '개발',
  version: '1.0.0',
  price: 0, // 무료 모듈
  requires_approval: false,
  
  // 메뉴 아이템 정의
  menuItems: [
    {
      label: '예제 모듈',
      icon: 'Lab',
      path: '/modules/example',
      display_order: 1,
    },
    {
      label: '기본 예제',
      icon: 'FileText',
      path: '/modules/example/basic',
      parent_id: 'example-module',
      display_order: 1,
    },
    {
      label: '고급 예제',
      icon: 'Settings',
      path: '/modules/example/advanced',
      parent_id: 'example-module',
      permission: 'example.advanced.view',
      display_order: 2,
    }
  ],
  
  // 권한 정의
  permissions: [
    {
      name: 'example.basic.view',
      description: '기본 예제 보기 권한',
      default_roles: ['owner', 'admin', 'member'],
    },
    {
      name: 'example.advanced.view',
      description: '고급 예제 보기 권한',
      default_roles: ['owner', 'admin'],
    },
    {
      name: 'example.data.edit',
      description: '예제 데이터 편집 권한',
      default_roles: ['owner', 'admin'],
    }
  ],
  
  // 데이터 스키마 정의
  dataSchemas: [
    {
      name: 'example_items',
      description: '예제 아이템 데이터 스키마',
      is_shared: true,
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'status', 'created_at'],
      },
      caching_strategy: {
        strategy: 'hybrid',
        ttl_seconds: 300, // 5분 캐시
        invalidate_on_events: ['example.item.created', 'example.item.updated', 'example.item.deleted'],
      },
    }
  ],
  
  // 이벤트 타입 정의
  eventTypes: [
    'example.item.created',
    'example.item.updated',
    'example.item.deleted',
    'example.settings.changed',
  ],
  
  // 이벤트 구독 정의
  eventSubscriptions: [
    {
      event_type: 'user.created',
      source_module_id: '*', // 시스템 이벤트 구독
    }
  ],
};

/**
 * 예제 모듈 라이프사이클 핸들러
 */
export const exampleModuleLifecycle: ModuleLifecycle = {
  onInstall: async (companyId: string) => {
    console.log(`예제 모듈이 회사(${companyId})에 설치되었습니다.`);
    // 여기서 초기 설정, 데이터 생성 등을 수행
  },
  
  onUninstall: async (companyId: string) => {
    console.log(`예제 모듈이 회사(${companyId})에서 제거되었습니다.`);
    // 여기서 정리 작업 수행
  },
  
  onEnable: async (companyId: string) => {
    console.log(`예제 모듈이 회사(${companyId})에서 활성화되었습니다.`);
    // 모듈 활성화 시 필요한 작업 수행
  },
  
  onDisable: async (companyId: string) => {
    console.log(`예제 모듈이 회사(${companyId})에서 비활성화되었습니다.`);
    // 모듈 비활성화 시 필요한 작업 수행
  },
  
  onUpdate: async (companyId: string, prevVersion: string, newVersion: string) => {
    console.log(`예제 모듈이 회사(${companyId})에서 업데이트되었습니다: ${prevVersion} → ${newVersion}`);
    // 버전 간 마이그레이션 작업 수행
    
    // 버전별 업데이트 로직
    if (prevVersion === '1.0.0' && newVersion === '1.1.0') {
      // 1.0.0 → 1.1.0 업데이트 로직
      console.log('1.0.0 → 1.1.0 업데이트 적용 중...');
    }
  },
};

/**
 * 예제 모듈을 등록하는 함수
 */
export async function registerExampleModule() {
  try {
    const result = await registerModule(exampleModuleConfig);
    console.log('예제 모듈이 성공적으로 등록되었습니다:', result);
    return result;
  } catch (error) {
    console.error('예제 모듈 등록 오류:', error);
    throw error;
  }
} 