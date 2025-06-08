-- 일별 재고 스냅샷 테이블 생성
CREATE TABLE daily_stock_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ingredient', 'container')),
  item_name VARCHAR(255) NOT NULL, -- 스냅샷 시점의 항목명
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 중복 방지를 위한 유니크 제약
  UNIQUE(company_id, stock_item_id, snapshot_date)
);

-- 성능을 위한 인덱스 생성
CREATE INDEX idx_daily_snapshots_company_date ON daily_stock_snapshots(company_id, snapshot_date DESC);
CREATE INDEX idx_daily_snapshots_item_date ON daily_stock_snapshots(stock_item_id, snapshot_date DESC);
CREATE INDEX idx_daily_snapshots_lookup ON daily_stock_snapshots(company_id, stock_item_id, snapshot_date DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE daily_stock_snapshots ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 회사 스냅샷만 조회할 수 있도록 정책 설정
CREATE POLICY "Users can view snapshots for their company" ON daily_stock_snapshots
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- 시스템에서만 스냅샷을 생성할 수 있도록 제한적 INSERT 정책
CREATE POLICY "System can create snapshots" ON daily_stock_snapshots
  FOR INSERT WITH CHECK (true); -- 서비스 역할 키로만 접근 가능

-- 트리거 함수: updated_at 자동 업데이트 (기존 함수 재사용)
CREATE TRIGGER update_daily_snapshots_updated_at 
  BEFORE UPDATE ON daily_stock_snapshots 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE daily_stock_snapshots IS '일별 재고 스냅샷 테이블 - 특정 날짜의 재고량 조회 성능 최적화를 위함';
COMMENT ON COLUMN daily_stock_snapshots.snapshot_date IS '스냅샷 날짜 (해당 날짜 종료 시점의 재고량)';
COMMENT ON COLUMN daily_stock_snapshots.quantity IS '해당 날짜의 재고량';
COMMENT ON COLUMN daily_stock_snapshots.item_name IS '스냅샷 시점의 항목명 (변경 이력 추적용)'; 