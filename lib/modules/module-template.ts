import { MarketplaceModule } from '@/lib/types';

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  price?: number;
  requires_approval: boolean;
  dependencies?: string[]; // 의존하는 다른 모듈 ID 배열
  menuItems: ModuleMenuItem[];
  permissions: ModulePermissionDefinition[];
  dataSchemas: ModuleDataSchemaDefinition[];
  eventTypes: string[]; // 모듈이 발행할 수 있는 이벤트 유형
  eventSubscriptions: ModuleEventSubscriptionDefinition[]; // 모듈이 구독할 이벤트 유형
}

export interface ModuleMenuItem {
  label: string;
  icon: string;
  path: string;
  permission?: string; // 필요한 권한
  parent_id?: string; // 부모 메뉴 ID (하위 메뉴일 경우)
  display_order: number;
}

export interface ModulePermissionDefinition {
  name: string;
  description: string;
  default_roles: string[]; // 기본적으로 이 권한을 가질 역할 목록 (owner, admin, member)
}

export interface ModuleDataSchemaDefinition {
  name: string;
  description: string;
  schema: Record<string, any>; // JSON 스키마 형식으로 필드 정의
  is_shared: boolean; // 다른 모듈과 공유 가능 여부
  caching_strategy?: {
    strategy: 'time_based' | 'event_based' | 'hybrid';
    ttl_seconds?: number;
    invalidate_on_events?: string[];
  };
}

export interface ModuleEventSubscriptionDefinition {
  event_type: string;
  source_module_id: string | '*'; // '*'는 모든 모듈의 해당 이벤트를 구독
}

// 모듈 인스턴스 생성 함수
export async function registerModule(config: ModuleConfig): Promise<MarketplaceModule> {
  // 여기서 API를 호출하여 모듈을 시스템에 등록합니다
  // 실제 구현에서는 모듈 등록, 메뉴 아이템 생성, 권한 설정 등의 작업 수행
  try {
    // 서버 환경에서는 절대 URL이 필요합니다
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/marketplace/modules/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`모듈 등록 실패: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('모듈 등록 오류:', error);
    throw error;
  }
}

// 모듈 라이프사이클 훅
export interface ModuleLifecycle {
  onInstall?: (companyId: string) => Promise<void>;
  onUninstall?: (companyId: string) => Promise<void>;
  onEnable?: (companyId: string) => Promise<void>;
  onDisable?: (companyId: string) => Promise<void>;
  onUpdate?: (companyId: string, prevVersion: string, newVersion: string) => Promise<void>;
}

// 모듈 설정 정의
export interface ModuleSettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  default_value?: any;
  options?: { label: string; value: string | number | boolean }[]; // select/multiselect 옵션
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
}

// 모듈 헬퍼 함수들
export const ModuleHelpers = {
  // 모듈 설정 값 가져오기
  async getSetting(companyId: string, moduleId: string, key: string): Promise<any> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/marketplace/modules/${moduleId}/settings/${key}?companyId=${companyId}`);
      if (!response.ok) {
        throw new Error(`설정 조회 실패: ${response.statusText}`);
      }
      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('설정 조회 오류:', error);
      return null;
    }
  },
  
  // 모듈 설정 값 저장하기
  async setSetting(companyId: string, moduleId: string, key: string, value: any): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/marketplace/modules/${moduleId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId, key, value }),
      });
      return response.ok;
    } catch (error) {
      console.error('설정 저장 오류:', error);
      return false;
    }
  },
  
  // 이벤트 발행하기
  async publishEvent(companyId: string, moduleId: string, eventType: string, data: any): Promise<boolean> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/marketplace/events/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId, 
          sourceModuleId: moduleId,
          eventType,
          data
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('이벤트 발행 오류:', error);
      return false;
    }
  }
}; 