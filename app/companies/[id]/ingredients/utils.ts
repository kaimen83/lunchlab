import { IngredientFormValues } from './schema';

/**
 * 가격 형식을 한국 통화 형태로 변환합니다.
 */
export const formatPrice = (value: string): string => {
  const numberValue = value.replace(/[^\d]/g, '');
  if (!numberValue) return '';
  
  return new Intl.NumberFormat('ko-KR').format(parseInt(numberValue));
};

/**
 * 폼 제출을 위해 데이터를 정제합니다.
 */
export const cleanFormData = (data: IngredientFormValues): IngredientFormValues => {
  return {
    ...data,
    supplier_id: data.supplier_id && data.supplier_id.trim() !== '' ? data.supplier_id : null,
    code_name: data.code_name || null,
    stock_grade: data.stock_grade || null,
    memo1: data.memo1 || null,
    items_per_box: data.items_per_box === 0 ? null : data.items_per_box,
  };
}; 