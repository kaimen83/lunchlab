// 재고 실사 세션 타입
export interface StockAudit {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  audit_date: string; // 실사 날짜 (사용자가 선택한 실사 수행 날짜)
  warehouse_id: string; // 창고 ID
  created_by: string; // Clerk user ID
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

// 재고 실사 항목 타입
export interface StockAuditItem {
  id: string;
  audit_id: string;
  stock_item_id: string;
  item_name: string;
  item_code?: string; // 식자재/용기 코드명 (검색 성능 향상을 위해 저장)
  item_type: 'ingredient' | 'container';
  unit?: string;
  book_quantity: number; // 장부상 재고량
  actual_quantity?: number; // 실사량 (null이면 미입력)
  difference?: number; // 차이 (자동 계산)
  status: 'pending' | 'completed' | 'discrepancy';
  notes?: string;
  audited_by?: string; // Clerk user ID
  audited_at?: string;
  created_at: string;
  updated_at: string;
  code_name?: string; // 식자재/용기 코드명 (하위 호환성을 위해 유지)
  stock_grade?: string; // 재고 등급 (식자재만 해당)
}

// 실사 생성 요청 타입
export interface CreateStockAuditRequest {
  name: string;
  description?: string;
  audit_date: string; // 실사 날짜 (YYYY-MM-DD 형식)
  warehouse_id?: string; // 창고 ID (선택사항, 없으면 기본 창고 사용)
  item_types?: ('ingredient' | 'container')[]; // 포함할 항목 타입
  stock_grade?: string; // 재고등급 필터 (선택사항, 없으면 모든 등급)
}

// 실사 항목 업데이트 요청 타입
export interface UpdateStockAuditItemRequest {
  actual_quantity: number;
  notes?: string;
}

// 실사 통계 타입
export interface StockAuditStats {
  total_items: number;
  completed_items: number;
  pending_items: number;
  discrepancy_items: number;
  completion_rate: number; // 완료율 (%)
}

// 실사 목록 응답 타입
export interface StockAuditListResponse {
  audits: StockAudit[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
}

// 실사 상세 응답 타입
export interface StockAuditDetailResponse {
  audit: StockAudit;
  items: StockAuditItem[];
  stats: StockAuditStats;
  warehouse?: {
    id: string;
    name: string;
  };
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
} 