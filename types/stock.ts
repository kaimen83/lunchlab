// 재고 항목 타입
export interface StockItem {
  id: string;
  company_id: string;
  item_type: 'ingredient' | 'container';
  item_id: string;
  current_quantity: number;
  unit: string;
  last_updated: string;
  created_at: string;
  created_by?: string;
}

// 재고 거래 타입
export interface StockTransaction {
  id: string;
  stock_item_id: string;
  transaction_type: 'incoming' | 'outgoing' | 'disposal' | 'adjustment';
  quantity: number;
  transaction_date: string;
  user_id: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

// 일별 재고 스냅샷 타입
export interface DailyStockSnapshot {
  id: string;
  company_id: string;
  stock_item_id: string;
  snapshot_date: string; // YYYY-MM-DD 형식
  quantity: number;
  unit: string;
  item_type: 'ingredient' | 'container';
  item_name: string;
  created_at: string;
}

// 특정 날짜 재고 조회 요청 타입
export interface StockAtDateRequest {
  companyId: string;
  targetDate: string; // YYYY-MM-DD 형식
  stockItemId?: string; // 특정 항목만 조회할 경우
}

// 특정 날짜 재고 조회 응답 타입
export interface StockAtDateResponse {
  items: StockItemAtDate[];
  targetDate: string;
  calculationMethod: 'snapshot' | 'realtime' | 'hybrid';
  snapshotDate?: string; // 스냅샷 기반 계산 시 사용된 스냅샷 날짜
}

// 특정 날짜의 재고 항목 타입
export interface StockItemAtDate {
  stock_item_id: string;
  item_type: 'ingredient' | 'container';
  item_name: string;
  quantity: number;
  unit: string;
  details: {
    id: string;
    name: string;
    code_name?: string;
    category?: string;
    [key: string]: any;
  };
}

// 스냅샷 생성 요청 타입
export interface CreateSnapshotRequest {
  date?: string; // 기본값: 어제 날짜
  companyIds?: string[]; // 특정 회사만 처리할 경우
}

// 스냅샷 생성 응답 타입
export interface CreateSnapshotResponse {
  success: boolean;
  processed: number;
  date: string;
  errors?: string[];
}

// 재고 이력 조회 타입
export interface StockHistoryItem {
  date: string;
  quantity: number;
  change: number;
  transaction_type?: string;
  notes?: string;
} 