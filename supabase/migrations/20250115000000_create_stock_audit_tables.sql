-- 재고 실사 세션 테이블
CREATE TABLE stock_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 실사명 (예: "2024년 1월 정기실사")
  description TEXT, -- 실사 설명
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_by UUID NOT NULL, -- Clerk user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 재고 실사 항목 테이블
CREATE TABLE stock_audit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES stock_audits(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL, -- 항목명 (스냅샷)
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ingredient', 'container')),
  unit VARCHAR(50), -- 단위 (스냅샷)
  book_quantity DECIMAL(10,3) NOT NULL DEFAULT 0, -- 장부상 재고량
  actual_quantity DECIMAL(10,3), -- 실사량 (NULL이면 미입력)
  difference DECIMAL(10,3) GENERATED ALWAYS AS (actual_quantity - book_quantity) STORED, -- 차이 (자동 계산)
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'discrepancy')),
  notes TEXT, -- 메모/특이사항
  audited_by UUID, -- 실사 담당자 (Clerk user ID)
  audited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_stock_audits_company_id ON stock_audits(company_id);
CREATE INDEX idx_stock_audits_status ON stock_audits(status);
CREATE INDEX idx_stock_audit_items_audit_id ON stock_audit_items(audit_id);
CREATE INDEX idx_stock_audit_items_status ON stock_audit_items(status);
CREATE INDEX idx_stock_audit_items_stock_item_id ON stock_audit_items(stock_item_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE stock_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_audit_items ENABLE ROW LEVEL SECURITY;

-- stock_audits 테이블 정책
CREATE POLICY "Users can view audits for their company" ON stock_audits
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can create audits for their company" ON stock_audits
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update audits for their company" ON stock_audits
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- stock_audit_items 테이블 정책
CREATE POLICY "Users can view audit items for their company" ON stock_audit_items
  FOR SELECT USING (
    audit_id IN (
      SELECT id FROM stock_audits 
      WHERE company_id IN (
        SELECT company_id FROM company_memberships 
        WHERE user_id = auth.jwt() ->> 'sub'
      )
    )
  );

CREATE POLICY "Users can create audit items for their company" ON stock_audit_items
  FOR INSERT WITH CHECK (
    audit_id IN (
      SELECT id FROM stock_audits 
      WHERE company_id IN (
        SELECT company_id FROM company_memberships 
        WHERE user_id = auth.jwt() ->> 'sub'
      )
    )
  );

CREATE POLICY "Users can update audit items for their company" ON stock_audit_items
  FOR UPDATE USING (
    audit_id IN (
      SELECT id FROM stock_audits 
      WHERE company_id IN (
        SELECT company_id FROM company_memberships 
        WHERE user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_stock_audits_updated_at 
  BEFORE UPDATE ON stock_audits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_audit_items_updated_at 
  BEFORE UPDATE ON stock_audit_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 실사 항목 상태 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_audit_item_status()
RETURNS TRIGGER AS $$
BEGIN
  -- actual_quantity가 입력되면 상태 업데이트
  IF NEW.actual_quantity IS NOT NULL THEN
    NEW.audited_at = NOW();
    
    -- 차이가 있으면 discrepancy, 없으면 completed
    IF ABS(NEW.actual_quantity - NEW.book_quantity) > 0.001 THEN
      NEW.status = 'discrepancy';
    ELSE
      NEW.status = 'completed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_audit_item_status_trigger
  BEFORE UPDATE ON stock_audit_items
  FOR EACH ROW EXECUTE FUNCTION update_audit_item_status(); 