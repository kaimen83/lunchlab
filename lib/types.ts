export type UserRole = 'headAdmin' | 'user' | 'tester';

export interface UserProfile {
  name: string;
  phoneNumber: string;
  affiliation: string;
}

export interface UserMetadata {
  role: UserRole;
  profileCompleted?: boolean;
  profile?: UserProfile;
}

// 회사 관련 타입 추가
export interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
}

// 회사 멤버 역할
export type CompanyMemberRole = 'owner' | 'admin' | 'member';

// 회사 멤버십
export interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  created_at: string;
  updated_at?: string;
}

// 회사 초대
export interface CompanyInvitation {
  id: string;
  company_id: string;
  invited_by: string;
  invited_user_id: string;
  role: CompanyMemberRole;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

// 회사 가입 신청
export interface CompanyJoinRequest {
  id: string;
  company_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at?: string;
}

// 마켓플레이스 모듈 타입
export interface MarketplaceModule {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category: string;
  price?: number;
  is_active: boolean;
  requires_approval: boolean;
  version: string;
  created_at: string;
  updated_at?: string;
}

// 모듈 기능 타입
export interface ModuleFeature {
  id: string;
  module_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// 회사-모듈 구독 상태
export type ModuleSubscriptionStatus = 'active' | 'pending' | 'suspended' | 'cancelled';

// 모듈 결제 상태
export type ModulePaymentStatus = 'free' | 'paid' | 'trial' | 'overdue';

// 회사-모듈 구독 정보
export interface CompanyModule {
  id: string;
  company_id: string;
  module_id: string;
  status: ModuleSubscriptionStatus;
  start_date: string;
  end_date?: string;
  payment_status: ModulePaymentStatus;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// 모듈 설정 타입
export interface ModuleSetting {
  id: string;
  company_id: string;
  module_id: string;
  key: string;
  value?: string;
  created_at: string;
  updated_at?: string;
}

// 모듈 권한 타입
export interface ModulePermission {
  id: string;
  module_id: string;
  name: string;
  description?: string;
  created_at: string;
}

// 역할별 모듈 권한 타입
export interface RoleModulePermission {
  id: string;
  role: CompanyMemberRole;
  module_id: string;
  permission_id: string;
  created_at: string;
}

// 모듈 메뉴 아이템 타입
export interface ModuleMenuItem {
  id: string;
  module_id: string;
  label: string;
  icon?: string;
  path: string;
  parent_id?: string;
  permission?: string;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

// 회사별 메뉴 설정 타입
export interface CompanyMenuSetting {
  id: string;
  company_id: string;
  menu_item_id: string;
  is_visible: boolean;
  display_order?: number;
  created_at: string;
  updated_at?: string;
}

// 모듈 데이터 권한 타입
export interface ModuleDataPermission {
  id: string;
  source_module_id: string;
  target_module_id: string;
  data_type: string;
  permission_type: 'read' | 'write';
  created_at: string;
}

// 모듈 이벤트 타입
export interface ModuleEvent {
  id: string;
  company_id: string;
  source_module_id: string;
  event_type: string;
  data_id?: string;
  data_type?: string;
  event_data?: any;
  processed: boolean;
  created_at: string;
  updated_at?: string;
}

// 모듈 이벤트 구독 타입 추가
export interface ModuleEventSubscription {
  id: string;
  company_id: string;
  module_id: string;
  event_type: string;
  callback_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// 모듈 데이터 연동 관련 타입들

// 모듈 데이터 스키마 정의
export interface ModuleDataSchema {
  id: string;
  module_id: string;
  name: string;
  description?: string;
  schema: Record<string, any>; // JSON 스키마 형식 (필드 정의)
  version: string;
  is_shared: boolean;      // 다른 모듈과 공유 가능 여부
  created_at: string;
  updated_at?: string;
}

// 데이터 액세스 요청 상태
export type DataAccessRequestStatus = 'pending' | 'approved' | 'rejected';

// 모듈 간 데이터 액세스 요청
export interface ModuleDataAccessRequest {
  id: string;
  company_id: string;
  requester_module_id: string;
  provider_module_id: string;
  data_schema_id: string;
  access_level: 'read' | 'write' | 'read_write';
  status: DataAccessRequestStatus;
  requested_by: string;
  reviewed_by?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

// 모듈 간 데이터 액세스 권한
export interface ModuleDataAccess {
  id: string;
  company_id: string;
  requester_module_id: string;
  provider_module_id: string;
  data_schema_id: string;
  access_level: 'read' | 'write' | 'read_write';
  access_token: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  is_active: boolean;
}

// 공유 데이터 캐시 항목
export interface SharedDataCacheItem {
  id: string;
  company_id: string;
  module_id: string;
  data_schema_id: string;
  data_id: string;
  cache_key: string;
  data: Record<string, any>;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

// 분기 캐싱 정책 종류
export type CachingStrategy = 'time_based' | 'event_based' | 'hybrid';

// 모듈별 캐싱 정책 설정
export interface ModuleCachingPolicy {
  id: string;
  module_id: string;
  data_schema_id: string;
  strategy: CachingStrategy;
  ttl_seconds?: number;      // time_based 캐싱일 경우 TTL
  invalidate_on_events?: string[]; // event_based 캐싱일 경우 무효화 트리거 이벤트 목록
  created_at: string;
  updated_at?: string;
}

// 모듈 데이터 매핑 정의
export interface ModuleDataMapping {
  id: string;
  company_id: string;
  source_module_id: string;
  target_module_id: string;
  source_schema_id: string;
  target_schema_id: string;
  field_mappings: Record<string, string>; // 필드 간 매핑 정보 (key: 타겟 필드, value: 소스 필드)
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// 데이터 동기화 로그
export interface DataSyncLog {
  id: string;
  company_id: string;
  source_module_id: string;
  target_module_id: string;
  mapping_id: string;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  items_processed: number;
  items_synced: number;
  created_at: string;
} 