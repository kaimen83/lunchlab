-- 모듈 설정 테이블 생성
-- 각 회사의 모듈별 설정 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.module_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, module_id, key)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

-- 회사 구성원은 회사의 모듈 설정 정보를 읽을 수 있음
CREATE POLICY "회사 구성원 모듈 설정 정보 읽기 가능" 
  ON public.module_settings 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
    )
  );

-- 회사 관리자나 소유자만 모듈 설정 관리 가능
CREATE POLICY "회사 관리자 모듈 설정 관리 권한" 
  ON public.module_settings 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'owner')
    )
  );

-- 시스템 관리자도 모든 설정 관리 가능
CREATE POLICY "시스템 관리자 모듈 설정 관리 권한" 
  ON public.module_settings 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_settings_company_id_idx ON public.module_settings(company_id);
CREATE INDEX IF NOT EXISTS module_settings_module_id_idx ON public.module_settings(module_id);
CREATE INDEX IF NOT EXISTS module_settings_key_idx ON public.module_settings(key);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_module_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_module_settings_updated_at
BEFORE UPDATE ON public.module_settings
FOR EACH ROW
EXECUTE FUNCTION update_module_settings_updated_at(); 