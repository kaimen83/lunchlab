-- 재고 항목의 unique 제약조건 수정
-- 같은 아이템이 다른 창고에 존재할 수 있도록 warehouse_id를 포함

-- 1. 기존 unique 제약조건 삭제
ALTER TABLE stock_items 
DROP CONSTRAINT IF EXISTS stock_items_company_id_item_type_item_id_key;

-- 2. 새로운 unique 제약조건 추가 (warehouse_id 포함)
ALTER TABLE stock_items 
ADD CONSTRAINT stock_items_company_id_warehouse_id_item_type_item_id_key 
UNIQUE (company_id, warehouse_id, item_type, item_id);

-- 3. warehouse_id가 NULL인 기존 레코드가 있다면 기본 창고로 설정하는 로직
-- (warehouse_id가 NOT NULL 제약조건이 있다면 이미 모든 레코드에 값이 있을 것임)
UPDATE stock_items 
SET warehouse_id = (
  SELECT id FROM warehouses 
  WHERE warehouses.company_id = stock_items.company_id 
  AND is_default = true 
  LIMIT 1
)
WHERE warehouse_id IS NULL;

-- 4. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_stock_items_company_warehouse_item 
ON stock_items (company_id, warehouse_id, item_type, item_id);

COMMENT ON CONSTRAINT stock_items_company_id_warehouse_id_item_type_item_id_key 
ON stock_items IS '같은 회사의 같은 창고에서 같은 아이템은 하나의 재고 항목만 가질 수 있음'; 