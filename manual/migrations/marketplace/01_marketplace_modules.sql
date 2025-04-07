-- 마켓플레이스 모듈 테이블 생성
-- 모듈 기본 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.marketplace_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  version VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.marketplace_modules ENABLE ROW LEVEL SECURITY;

-- 일반 사용자는 활성 모듈만 읽기 가능
CREATE POLICY "활성 모듈 읽기 가능" 
  ON public.marketplace_modules 
  FOR SELECT 
  USING (is_active = true);

-- 관리자만 모듈 생성, 수정, 삭제 가능 (별도 함수를 통해 권한 확인)
CREATE POLICY "관리자 모듈 관리 권한" 
  ON public.marketplace_modules 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS marketplace_modules_category_idx ON public.marketplace_modules(category);
CREATE INDEX IF NOT EXISTS marketplace_modules_is_active_idx ON public.marketplace_modules(is_active);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_marketplace_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_marketplace_modules_updated_at
BEFORE UPDATE ON public.marketplace_modules
FOR EACH ROW
EXECUTE FUNCTION update_marketplace_modules_updated_at(); 