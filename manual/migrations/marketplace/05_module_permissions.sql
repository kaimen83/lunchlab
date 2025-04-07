-- 모듈 권한 테이블 생성
-- 각 모듈이 제공하는 권한 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, name)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 권한 정보를 읽을 수 있음
CREATE POLICY "모듈 권한 정보 읽기 가능" 
  ON public.module_permissions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      WHERE m.id = module_id AND m.is_active = true
    )
  );

-- 관리자만 모듈 권한 생성, 수정, 삭제 가능
CREATE POLICY "관리자 모듈 권한 관리 권한" 
  ON public.module_permissions 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_permissions_module_id_idx ON public.module_permissions(module_id);

-- 역할별 모듈 권한 테이블 생성
-- 각 회사 역할별로 가지는 모듈 권한 정보를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.module_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, module_id, permission_id)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 역할별 권한 정보를 읽을 수 있음
CREATE POLICY "역할별 모듈 권한 정보 읽기 가능" 
  ON public.role_module_permissions 
  FOR SELECT 
  USING (true);

-- 관리자만 역할별 모듈 권한 생성, 수정, 삭제 가능
CREATE POLICY "관리자 역할별 모듈 권한 관리 권한" 
  ON public.role_module_permissions 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS role_module_permissions_role_idx ON public.role_module_permissions(role);
CREATE INDEX IF NOT EXISTS role_module_permissions_module_id_idx ON public.role_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS role_module_permissions_permission_id_idx ON public.role_module_permissions(permission_id); 