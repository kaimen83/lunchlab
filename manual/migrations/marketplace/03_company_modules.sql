-- 회사-모듈 구독 관계 테이블 생성
-- 회사의 모듈 구독 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.company_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  payment_status VARCHAR(20) DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'trial', 'overdue')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, module_id)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

-- 회사 구성원은 회사의 모듈 구독 정보를 읽을 수 있음
CREATE POLICY "회사 구성원 모듈 구독 정보 읽기 가능" 
  ON public.company_modules 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
    )
  );

-- 회사 관리자나 소유자만 모듈 구독 상태 관리 가능
CREATE POLICY "회사 관리자 모듈 구독 관리 권한" 
  ON public.company_modules 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'owner')
    )
  );

-- 시스템 관리자도 모든 구독 관리 가능
CREATE POLICY "시스템 관리자 모듈 구독 관리 권한" 
  ON public.company_modules 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS company_modules_company_id_idx ON public.company_modules(company_id);
CREATE INDEX IF NOT EXISTS company_modules_module_id_idx ON public.company_modules(module_id);
CREATE INDEX IF NOT EXISTS company_modules_status_idx ON public.company_modules(status);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_company_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_company_modules_updated_at
BEFORE UPDATE ON public.company_modules
FOR EACH ROW
EXECUTE FUNCTION update_company_modules_updated_at(); 