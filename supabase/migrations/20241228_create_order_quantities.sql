-- 발주량 저장 테이블 생성
CREATE TABLE order_quantities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  order_quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 회사별, 날짜별, 식재료별로 유니크 제약 조건
  UNIQUE(company_id, date, ingredient_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_order_quantities_company_date ON order_quantities(company_id, date);
CREATE INDEX idx_order_quantities_ingredient ON order_quantities(ingredient_id);

-- 업데이트 시간 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_order_quantities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_order_quantities_updated_at
  BEFORE UPDATE ON order_quantities
  FOR EACH ROW
  EXECUTE FUNCTION update_order_quantities_updated_at();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE order_quantities ENABLE ROW LEVEL SECURITY;

-- 회사 소속 사용자만 해당 회사의 발주량 데이터에 접근 가능
CREATE POLICY "Users can view order quantities for their company" ON order_quantities
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order quantities for their company" ON order_quantities
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update order quantities for their company" ON order_quantities
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete order quantities for their company" ON order_quantities
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid()
    )
  ); 