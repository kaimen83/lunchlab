'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PackageOpen } from 'lucide-react';
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

// 유효성 검사 스키마
const ingredientSchema = z.object({
  name: z
    .string()
    .min(1, { message: '식재료 이름은 필수입니다.' })
    .max(100, { message: '식재료 이름은 100자 이하여야 합니다.' }),
  package_amount: z
    .number()
    .min(0.1, { message: '포장량은 0.1 이상이어야 합니다.' }),
  unit: z
    .string()
    .min(1, { message: '단위는 필수입니다.' })
    .max(20, { message: '단위는 20자 이하여야 합니다.' }),
  price: z
    .number()
    .min(0, { message: '가격은 0 이상이어야 합니다.' }),
  memo1: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional(),
  memo2: z
    .string()
    .max(200, { message: '메모는 200자 이하여야 합니다.' })
    .optional(),
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
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
      package_amount: 0,
      unit: '',
      price: 0,
      memo1: '',
      memo2: '',
    },
  });

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && ingredient) {
      form.reset({
        name: ingredient.name,
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        memo1: ingredient.memo1 || '',
        memo2: ingredient.memo2 || '',
      });
    } else {
      form.reset({
        name: '',
        package_amount: 0,
        unit: '',
        price: 0,
        memo1: '',
        memo2: '',
      });
    }
  }, [mode, ingredient, form]);

  // 폼 제출 처리
  const onSubmit = async (data: IngredientFormValues) => {
    setIsSubmitting(true);
    
    try {
      const url = mode === 'create'
        ? `/api/companies/${companyId}/ingredients`
        : `/api/companies/${companyId}/ingredients/${ingredient?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
                <FormControl>
                  <Input {...field} placeholder="kg, g, 박스 등" />
                </FormControl>
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

        <FormField
          control={form.control}
          name="memo1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모 1</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="추가 정보를 입력하세요"
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memo2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모 2</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="추가 정보를 입력하세요"
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : mode === 'create' ? '추가' : '수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 