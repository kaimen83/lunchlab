-- 모듈 기능 테이블 생성
-- 각 모듈이 제공하는 기능들을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.module_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_features ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "모듈 기능 읽기 가능" 
  ON public.module_features 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      WHERE m.id = module_id AND m.is_active = true
    )
  );

-- 관리자만 모듈 기능 생성, 수정, 삭제 가능
CREATE POLICY "관리자 모듈 기능 관리 권한" 
  ON public.module_features 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_features_module_id_idx ON public.module_features(module_id);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_module_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_module_features_updated_at
BEFORE UPDATE ON public.module_features
FOR EACH ROW
EXECUTE FUNCTION update_module_features_updated_at(); 