-- 식단 계획 테이블
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  meal_time TEXT NOT NULL CHECK (meal_time IN ('breakfast', 'lunch', 'dinner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 식단과 메뉴 연결 테이블
CREATE TABLE IF NOT EXISTS meal_plan_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meal_plan_id, menu_id)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS meal_plans_company_id_idx ON meal_plans(company_id);
CREATE INDEX IF NOT EXISTS meal_plans_date_idx ON meal_plans(date);
CREATE INDEX IF NOT EXISTS meal_plans_meal_time_idx ON meal_plans(meal_time);
CREATE INDEX IF NOT EXISTS meal_plan_menus_meal_plan_id_idx ON meal_plan_menus(meal_plan_id);
CREATE INDEX IF NOT EXISTS meal_plan_menus_menu_id_idx ON meal_plan_menus(menu_id);

-- 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용 (이미 존재하는 트리거가 있다면 먼저 삭제)
DROP TRIGGER IF EXISTS update_meal_plans_modtime ON meal_plans;
CREATE TRIGGER update_meal_plans_modtime
BEFORE UPDATE ON meal_plans
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 