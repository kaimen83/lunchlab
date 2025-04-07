-- company_join_requests 테이블 생성
CREATE TABLE IF NOT EXISTS public.company_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- 중복 가입 신청 방지 (한 사용자가 한 회사에 한 번만 신청 가능)
  UNIQUE(company_id, user_id, status)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.company_join_requests ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성 (성능 향상을 위해)
CREATE INDEX IF NOT EXISTS company_join_requests_company_id_idx ON public.company_join_requests(company_id);
CREATE INDEX IF NOT EXISTS company_join_requests_user_id_idx ON public.company_join_requests(user_id);
CREATE INDEX IF NOT EXISTS company_join_requests_status_idx ON public.company_join_requests(status);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_company_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_company_join_requests_updated_at
BEFORE UPDATE ON public.company_join_requests
FOR EACH ROW
EXECUTE FUNCTION update_company_join_requests_updated_at(); 