-- 모듈 데이터 권한 테이블 생성
-- 모듈 간 데이터 접근 권한을 정의하는 테이블
CREATE TABLE IF NOT EXISTS public.module_data_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  target_module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  data_type VARCHAR(100) NOT NULL,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('read', 'write')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_module_id, target_module_id, data_type, permission_type)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_data_permissions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 데이터 권한 정보를 읽을 수 있음
CREATE POLICY "모듈 데이터 권한 정보 읽기 가능" 
  ON public.module_data_permissions 
  FOR SELECT 
  USING (true);

-- 관리자만 데이터 권한 생성, 수정, 삭제 가능
CREATE POLICY "관리자 모듈 데이터 권한 관리 권한" 
  ON public.module_data_permissions 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_data_permissions_source_module_id_idx ON public.module_data_permissions(source_module_id);
CREATE INDEX IF NOT EXISTS module_data_permissions_target_module_id_idx ON public.module_data_permissions(target_module_id);
CREATE INDEX IF NOT EXISTS module_data_permissions_data_type_idx ON public.module_data_permissions(data_type);

-- 모듈 이벤트 테이블 생성
-- 모듈 간 데이터 변경 이벤트를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.module_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  data_id UUID,
  data_type VARCHAR(100),
  event_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_events ENABLE ROW LEVEL SECURITY;

-- 회사 구성원은 회사의 이벤트 정보를 읽을 수 있음
CREATE POLICY "회사 구성원 모듈 이벤트 정보 읽기 가능" 
  ON public.module_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
    )
  );

-- 회사 관리자나 소유자만 이벤트 생성 가능
CREATE POLICY "회사 관리자 모듈 이벤트 생성 권한" 
  ON public.module_events 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'owner')
    )
  );

-- 시스템 관리자는 모든 이벤트 관리 가능
CREATE POLICY "시스템 관리자 모듈 이벤트 관리 권한" 
  ON public.module_events 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_events_company_id_idx ON public.module_events(company_id);
CREATE INDEX IF NOT EXISTS module_events_source_module_id_idx ON public.module_events(source_module_id);
CREATE INDEX IF NOT EXISTS module_events_event_type_idx ON public.module_events(event_type);
CREATE INDEX IF NOT EXISTS module_events_processed_idx ON public.module_events(processed);
CREATE INDEX IF NOT EXISTS module_events_created_at_idx ON public.module_events(created_at); 