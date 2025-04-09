import * as z from 'zod';

// 유효성 검사 스키마
export const ingredientSchema = z.object({
  name: z
    .string()
    .min(1, { message: '식재료 이름은 필수입니다.' })
    .max(100, { message: '식재료 이름은 100자 이하여야 합니다.' }),
  code_name: z
    .string()
    .max(100, { message: '코드명은 100자 이하여야 합니다.' })
    .optional()
    .nullable(),
  supplier_id: z
    .string()
    .optional()
    .nullable(),
  package_amount: z
    .number()
    .min(0.1, { message: '포장량은 0.1 이상이어야 합니다.' }),
  unit: z
    .string()
    .min(1, { message: '단위는 필수입니다.' }),
  price: z
    .number()
    .min(0, { message: '가격은 0 이상이어야 합니다.' }),
  items_per_box: z
    .number()
    .min(0, { message: '박스당 갯수는 0 이상이어야 합니다.' })
    .optional()
    .nullable(),
  stock_grade: z
    .string()
    .optional()
    .nullable(),
  memo1: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional()
    .nullable(),
});

export type IngredientFormValues = z.infer<typeof ingredientSchema>;

export interface Ingredient {
  id: string;
  name: string;
  code_name?: string;
  supplier_id?: string;
  package_amount: number;
  unit: string;
  price: number;
  items_per_box?: number;
  stock_grade?: string;
  memo1?: string;
  created_at: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface SupplierOption {
  label: string;
  value: string;
} 