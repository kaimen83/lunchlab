'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PackageOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from "@/lib/utils";

// 유효성 검사 스키마
const ingredientSchema = z.object({
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

type IngredientFormValues = z.infer<typeof ingredientSchema>;

interface Ingredient {
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

interface IngredientFormProps {
  companyId: string;
  ingredient: Ingredient | null;
  mode: 'create' | 'edit';
  onSave: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

export default function IngredientForm({
  companyId,
  ingredient,
  mode,
  onSave,
  onCancel,
}: IngredientFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 초기화
  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      code_name: '',
      supplier_id: '',
      package_amount: 0,
      unit: 'g',
      price: 0,
      items_per_box: 0,
      stock_grade: '',
      memo1: '',
    },
  });

  // 식재료 업체 목록 상태
  const [suppliers, setSuppliers] = useState<{label: string, value: string}[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // 식재료 업체 목록 로드
  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoadingSuppliers(true);
      try {
        // 새로운 API를 호출하여 공급업체 정보를 불러옵니다
        const response = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
        
        if (!response.ok) {
          throw new Error('공급업체 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        const suppliersList = data.map((supplier: {id: string, name: string}) => ({
          label: supplier.name,
          value: supplier.id
        }));
        setSuppliers(suppliersList);
      } catch (error) {
        console.error('공급업체 로드 오류:', error);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, [companyId]);

  // 새 공급업체 추가 함수
  const addNewSupplier = async (supplierName: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: supplierName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '공급업체 추가에 실패했습니다.');
      }

      const newSupplier = await response.json();
      const newSupplierItem = {
        label: newSupplier.name,
        value: newSupplier.id
      };
      
      setSuppliers(prev => [...prev, newSupplierItem]);

      toast({
        title: '공급업체 추가 완료',
        description: `${newSupplier.name} 공급업체가 추가되었습니다.`,
        variant: 'default',
      });

      return newSupplier.id;
    } catch (error) {
      console.error('공급업체 추가 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '공급업체 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // 공급업체 선택 핸들러
  const handleSupplierSelect = (value: string) => {
    if (value && value.trim() !== '') {
      form.setValue('supplier_id', value);
    } else {
      form.setValue('supplier_id', null);
    }
  };

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && ingredient) {
      form.reset({
        name: ingredient.name,
        code_name: ingredient.code_name || '',
        supplier_id: ingredient.supplier_id || '',
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        items_per_box: ingredient.items_per_box || 0,
        stock_grade: ingredient.stock_grade || '',
        memo1: ingredient.memo1 || '',
      });
    } else {
      form.reset({
        name: '',
        code_name: '',
        supplier_id: '',
        package_amount: 0,
        unit: 'g',
        price: 0,
        items_per_box: 0,
        stock_grade: '',
        memo1: '',
      });
    }
  }, [mode, ingredient, form]);

  // 폼 제출 처리
  const onSubmit = async (data: IngredientFormValues) => {
    setIsSubmitting(true);
    
    try {
      // supplier_id가 빈 문자열이면 null로 변환
      const formData = {
        ...data,
        supplier_id: data.supplier_id && data.supplier_id.trim() !== '' ? data.supplier_id : null,
        code_name: data.code_name || null,
        stock_grade: data.stock_grade || null,
        memo1: data.memo1 || null,
        items_per_box: data.items_per_box === 0 ? null : data.items_per_box,
      };
      
      const url = mode === 'create'
        ? `/api/companies/${companyId}/ingredients`
        : `/api/companies/${companyId}/ingredients/${ingredient?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요청 처리 중 오류가 발생했습니다.');
      }
      
      const savedIngredient = await response.json();
      
      toast({
        title: mode === 'create' ? '식재료 추가 완료' : '식재료 수정 완료',
        description: `${savedIngredient.name} 식재료가 ${mode === 'create' ? '추가' : '수정'}되었습니다.`,
        variant: 'default',
      });
      
      onSave(savedIngredient);
    } catch (error) {
      console.error('식재료 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 금액 입력 시 자동 포맷팅
  const formatPrice = (value: string) => {
    const numberValue = value.replace(/[^\d]/g, '');
    if (!numberValue) return '';
    
    return new Intl.NumberFormat('ko-KR').format(parseInt(numberValue));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>식재료 이름</FormLabel>
              <FormControl>
                <Input {...field} placeholder="식재료 이름을 입력하세요" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code_name"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>코드명</FormLabel>
              <FormControl>
                <Input 
                  {...fieldProps} 
                  value={value || ""} 
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="코드명을 입력하세요" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplier_id"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>식재료 업체</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Select
                    onValueChange={handleSupplierSelect}
                    value={value || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="업체를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length > 0 ? (
                        suppliers.map((supplier) => (
                          <SelectItem 
                            key={supplier.value} 
                            value={supplier.value}
                          >
                            {supplier.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-center py-2 text-muted-foreground">
                          {isLoadingSuppliers ? "로딩 중..." : "등록된 공급업체가 없습니다."}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={async () => {
                      // 새 공급업체 추가를 위한 모달 또는 입력창 표시
                      const name = prompt("새 공급업체 이름을 입력하세요");
                      if (name && name.trim()) {
                        const newSupplierId = await addNewSupplier(name.trim());
                        if (newSupplierId) {
                          form.setValue('supplier_id', newSupplierId);
                        }
                      }
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> 새 공급업체 추가
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="package_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>포장량</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="포장량을 입력하세요"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>단위</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="단위 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="EA">EA</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="price"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>가격 (원)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={formatPrice(value?.toString() || '0')}
                  onChange={(e) => {
                    const formatted = e.target.value.replace(/[^\d]/g, '');
                    onChange(formatted ? parseInt(formatted) : 0);
                  }}
                  placeholder="가격을 입력하세요"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="items_per_box"
            render={({ field }) => (
              <FormItem>
                <FormLabel>박스당 갯수</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="박스당 갯수를 입력하세요"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="stock_grade"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>재고관리 등급</FormLabel>
              <Select
                onValueChange={onChange}
                defaultValue={value || undefined}
                value={value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memo1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="추가 정보를 입력하세요"
                  rows={2}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center">
                <PackageOpen className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </span>
            ) : (
              mode === 'create' ? '추가하기' : '수정하기'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 