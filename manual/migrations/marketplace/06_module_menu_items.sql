-- 모듈 메뉴 아이템 테이블 생성
-- 각 모듈이 제공하는 사이드바 메뉴 아이템을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.module_menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES public.marketplace_modules(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(100),
  path VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES public.module_menu_items(id) ON DELETE CASCADE,
  permission VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.module_menu_items ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 메뉴 아이템을 읽을 수 있음
CREATE POLICY "모듈 메뉴 아이템 읽기 가능" 
  ON public.module_menu_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_modules m
      WHERE m.id = module_id AND m.is_active = true
    )
  );

-- 관리자만 메뉴 아이템 생성, 수정, 삭제 가능
CREATE POLICY "관리자 모듈 메뉴 아이템 관리 권한" 
  ON public.module_menu_items 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS module_menu_items_module_id_idx ON public.module_menu_items(module_id);
CREATE INDEX IF NOT EXISTS module_menu_items_parent_id_idx ON public.module_menu_items(parent_id);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_module_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_module_menu_items_updated_at
BEFORE UPDATE ON public.module_menu_items
FOR EACH ROW
EXECUTE FUNCTION update_module_menu_items_updated_at();

-- 회사별 메뉴 설정 테이블 생성
-- 각 회사별로 모듈 메뉴 아이템의 표시 여부 및 순서를 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.company_menu_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.module_menu_items(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, menu_item_id)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE public.company_menu_settings ENABLE ROW LEVEL SECURITY;

-- 회사 구성원은 회사의 메뉴 설정 정보를 읽을 수 있음
CREATE POLICY "회사 구성원 메뉴 설정 정보 읽기 가능" 
  ON public.company_menu_settings 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
    )
  );

-- 회사 관리자나 소유자만 메뉴 설정 관리 가능
CREATE POLICY "회사 관리자 메뉴 설정 관리 권한" 
  ON public.company_menu_settings 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_memberships cm
      WHERE cm.company_id = company_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'owner')
    )
  );

-- 시스템 관리자도 모든 메뉴 설정 관리 가능
CREATE POLICY "시스템 관리자 메뉴 설정 관리 권한" 
  ON public.company_menu_settings 
  FOR ALL 
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'headAdmin');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS company_menu_settings_company_id_idx ON public.company_menu_settings(company_id);
CREATE INDEX IF NOT EXISTS company_menu_settings_menu_item_id_idx ON public.company_menu_settings(menu_item_id);

-- 트리거 함수: 레코드 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_company_menu_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER set_company_menu_settings_updated_at
BEFORE UPDATE ON public.company_menu_settings
FOR EACH ROW
EXECUTE FUNCTION update_company_menu_settings_updated_at(); 