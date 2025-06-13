-- 재고 실사 테이블에 audit_date 컬럼 추가
ALTER TABLE stock_audits 
ADD COLUMN audit_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 기존 데이터의 audit_date를 created_at의 날짜 부분으로 설정
UPDATE stock_audits 
SET audit_date = DATE(created_at);

-- 인덱스 추가 (날짜별 조회 성능 향상)
CREATE INDEX idx_stock_audits_audit_date ON stock_audits(audit_date);

-- 코멘트 추가
COMMENT ON COLUMN stock_audits.audit_date IS '실사 날짜 (사용자가 선택한 실사 수행 날짜)'; 