-- menus 테이블에 code 필드 추가
ALTER TABLE menus ADD COLUMN IF NOT EXISTS code TEXT;

-- code 필드에 인덱스 추가
CREATE INDEX IF NOT EXISTS menus_code_idx ON menus(code);

-- 필드 설명 추가
COMMENT ON COLUMN menus.code IS '메뉴 식별을 위한 고유 코드 (예: 메뉴 번호 또는 코드)';
