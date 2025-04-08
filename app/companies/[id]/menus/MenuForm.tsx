'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import MenuIngredientsSelector from './MenuIngredientsSelector';

// 유효성 검사 스키마
const menuSchema = z.object({
  name: z
    .string()
    .min(1, { message: '메뉴 이름은 필수입니다.' })
    .max(100, { message: '메뉴 이름은 100자 이하여야 합니다.' }),
  price: z
    .union([
      z.number().min(0, { message: '판매가는 0 이상이어야 합니다.' }),
      z.string().transform((val, ctx) => {
        const parsed = parseInt(val.replace(/[^\d]/g, ''));
        if (isNaN(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '유효한 판매가를 입력해주세요.',
          });
          return z.NEVER;
        }
        return parsed;
      }),
    ]),
  serving_size: z
    .union([
      z.number().min(1, { message: '제공량은 1 이상이어야 합니다.' }),
      z.string().transform((val, ctx) => {
        const parsed = parseInt(val.replace(/[^\d]/g, ''));
        if (isNaN(parsed) || parsed < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: '유효한 제공량을 입력해주세요.',
          });
          return z.NEVER;
        }
        return parsed;
      }),
    ])
    .optional(),
  description: z
    .string()
    .max(500, { message: '설명은 500자 이하여야 합니다.' })
    .optional(),
  recipe: z
    .string()
    .max(2000, { message: '조리법은 2000자 이하여야 합니다.' })
    .optional(),
});

type MenuFormValues = z.infer<typeof menuSchema>;

interface Menu {
  id: string;
  name: string;
  cost: number;
  price: number;
  description?: string;
  recipe?: string;
  serving_size?: number;
  created_at: string;
  updated_at?: string;
}

interface MenuFormProps {
  companyId: string;
  menu: Menu | null;
  mode: 'create' | 'edit';
  onSave: (menu: Menu) => void;
  onCancel: () => void;
}

export default function MenuForm({
  companyId,
  menu,
  mode,
  onSave,
  onCancel,
}: MenuFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([]);
  const [cost, setCost] = useState(0);

  // 폼 초기화
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      price: 0,
      serving_size: 1,
      description: '',
      recipe: '',
    },
  });

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && menu) {
      form.reset({
        name: menu.name,
        price: menu.price,
        serving_size: menu.serving_size || 1,
        description: menu.description || '',
        recipe: menu.recipe || '',
      });
      
      // 메뉴에 포함된 식재료 조회
      fetchMenuIngredients(menu.id);
    } else {
      form.reset({
        name: '',
        price: 0,
        serving_size: 1,
        description: '',
        recipe: '',
      });
      setSelectedIngredients([]);
      setCost(0);
    }
  }, [mode, menu, form]);

  // 메뉴에 포함된 식재료 조회
  const fetchMenuIngredients = async (menuId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/${menuId}/ingredients`);
      
      if (!response.ok) {
        throw new Error('식재료 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setSelectedIngredients(data);
      
      // 원가 계산
      const totalCost = data.reduce((acc: number, item: any) => acc + (item.amount * item.ingredient.price / item.ingredient.package_amount), 0);
      setCost(totalCost);
    } catch (error) {
      console.error('메뉴 식재료 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 식재료를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 원가 업데이트
  const updateCost = (ingredients: any[]) => {
    const totalCost = ingredients.reduce((acc, item) => acc + (item.amount * item.ingredient.price / item.ingredient.package_amount), 0);
    setCost(totalCost);
  };

  // 식재료 목록 변경 핸들러
  const handleIngredientsChange = (ingredients: any[]) => {
    setSelectedIngredients(ingredients);
    updateCost(ingredients);
  };

  // 폼 제출 처리
  const onSubmit = async (data: MenuFormValues) => {
    if (selectedIngredients.length === 0) {
      toast({
        title: '식재료 필요',
        description: '최소 하나 이상의 식재료를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const ingredientsData = selectedIngredients.map(item => ({
        ingredient_id: item.ingredient.id,
        amount: item.amount,
      }));
      
      const menuData = {
        ...data,
        cost: Math.round(cost),
        ingredients: ingredientsData,
      };
      
      const url = mode === 'create'
        ? `/api/companies/${companyId}/menus`
        : `/api/companies/${companyId}/menus/${menu?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menuData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요청 처리 중 오류가 발생했습니다.');
      }
      
      const savedMenu = await response.json();
      
      toast({
        title: mode === 'create' ? '메뉴 추가 완료' : '메뉴 수정 완료',
        description: `${savedMenu.name} 메뉴가 ${mode === 'create' ? '추가' : '수정'}되었습니다.`,
        variant: 'default',
      });
      
      onSave(savedMenu);
    } catch (error) {
      console.error('메뉴 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 저장 중 오류가 발생했습니다.',
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
              <FormLabel>메뉴 이름</FormLabel>
              <FormControl>
                <Input {...field} placeholder="메뉴 이름을 입력하세요" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>판매가 (원)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={typeof value === 'number' ? formatPrice(value.toString()) : formatPrice(value || '')}
                    onChange={(e) => {
                      const formatted = e.target.value.replace(/[^\d]/g, '');
                      onChange(formatted ? parseInt(formatted) : '');
                    }}
                    placeholder="판매가를 입력하세요"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serving_size"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>제공량 (인분)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    step="1"
                    value={value || 1}
                    onChange={(e) => onChange(parseInt(e.target.value) || 1)}
                    placeholder="제공량을 입력하세요"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-blue-800">원가 계산</Label>
            <div className="text-lg font-semibold text-blue-800">
              {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(cost)}
            </div>
          </div>
          <p className="text-xs text-blue-600 mb-2">선택한 식재료의 양에 따라 자동으로 계산됩니다.</p>
          
          <MenuIngredientsSelector
            companyId={companyId}
            selectedIngredients={selectedIngredients}
            onChange={handleIngredientsChange}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메뉴 설명</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="메뉴에 대한 설명을 입력하세요"
                  rows={2}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>조리법</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="조리 방법을 입력하세요"
                  rows={4}
                  value={field.value || ''}
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