-- 식수 계획 테이블 생성
CREATE TABLE IF NOT EXISTS meal_portions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  headcount INTEGER NOT NULL CHECK (headcount > 0),
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 중복 방지 (한 날짜의 한 식단에 대한 식수 정보는 하나만)
  UNIQUE(company_id, meal_plan_id, date)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS meal_portions_company_id_idx ON meal_portions(company_id);
CREATE INDEX IF NOT EXISTS meal_portions_meal_plan_id_idx ON meal_portions(meal_plan_id);
CREATE INDEX IF NOT EXISTS meal_portions_date_idx ON meal_portions(date);

-- 업데이트 트리거 함수 (이미 존재한다면 재사용)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
    CREATE FUNCTION update_modified_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- 트리거 적용
DROP TRIGGER IF EXISTS update_meal_portions_modtime ON meal_portions;
CREATE TRIGGER update_meal_portions_modtime
BEFORE UPDATE ON meal_portions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 