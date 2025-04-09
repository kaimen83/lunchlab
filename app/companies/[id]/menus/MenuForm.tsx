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
// 타입 오류를 피하기 위해 바로 import 선언
import MenuIngredientsSelector from './MenuIngredientsSelector';
import MenuContainersForm from './components/MenuContainersForm';

// 식재료 타입 정의
interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

// 선택된 식재료 타입 정의
interface SelectedIngredient {
  id?: string;
  menu_id?: string;
  ingredient: Ingredient;
  ingredient_id: string;
  amount: number;
}

// 용기 타입 정의
interface MenuContainer {
  id?: string;
  menu_id?: string;
  container_size_id: string;
  container?: {
    id: string;
    name: string;
    description?: string;
  };
  ingredient_amount_factor: number;
  cost_price?: number;
}

// 변환 로직을 분리한 단순화된 zod 스키마
const menuSchema = z.object({
  name: z.string().min(1, { message: '메뉴 이름은 필수입니다.' }),
  description: z.string().max(500, { message: '설명은 500자 이하여야 합니다.' }).optional(),
  recipe: z.string().max(2000, { message: '조리법은 2000자 이하여야 합니다.' }).optional(),
});

// 스키마에서 자동으로 타입 추론
type MenuFormValues = z.infer<typeof menuSchema>;

interface Menu {
  id: string;
  name: string;
  cost_price: number;
  description?: string;
  recipe?: string;
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
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [menuContainers, setMenuContainers] = useState<MenuContainer[]>([]);
  const [cost, setCost] = useState(0);

  // 폼 초기화
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      description: '',
      recipe: '',
    },
  });

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && menu) {
      form.reset({
        name: menu.name,
        description: menu.description || '',
        recipe: menu.recipe || '',
      });
      
      // 메뉴에 포함된 식재료 조회
      fetchMenuIngredients(menu.id);
    } else {
      form.reset({
        name: '',
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
      const totalCost = data.reduce((acc: number, item: SelectedIngredient) => 
        acc + (item.amount * item.ingredient.price / item.ingredient.package_amount), 0);
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
  const updateCost = (ingredients: SelectedIngredient[]) => {
    const totalCost = ingredients.reduce(
      (acc, item) => acc + (item.amount * item.ingredient.price / item.ingredient.package_amount), 
      0
    );
    setCost(totalCost);
  };

  // 식재료 목록 변경 핸들러
  const handleIngredientsChange = (ingredients: SelectedIngredient[]) => {
    setSelectedIngredients(ingredients);
    updateCost(ingredients);
  };

  // 용기 목록 변경 핸들러
  const handleContainersChange = (containers: MenuContainer[]) => {
    setMenuContainers(containers);
  };

  // 숫자 포맷팅 유틸리티 함수
  const formatPrice = (value: number | string): string => {
    const numberValue = typeof value === 'string' 
      ? value.replace(/[^\d]/g, '') 
      : value.toString();
    
    if (!numberValue) return '';
    return new Intl.NumberFormat('ko-KR').format(parseInt(numberValue));
  };

  // 문자열에서 숫자로 변환하는 유틸리티 함수
  const parsePrice = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned) : 0;
  };

  // 폼 제출 처리
  const onSubmit = (data: MenuFormValues) => {
    if (selectedIngredients.length === 0) {
      toast({
        title: '식재료 필요',
        description: '최소 하나 이상의 식재료를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // API 호출 비동기 함수
    const submitForm = async () => {
      try {
        const ingredientsData = selectedIngredients.map(item => ({
          id: item.ingredient.id,
          amountPerPerson: item.amount,
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
    
    // 비동기 함수 실행
    submitForm();
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

        {/* 수정 모드이고 메뉴 ID가 있을 때만 용기 사이즈 폼 표시 */}
        {mode === 'edit' && menu?.id ? (
          <div className="mt-6">
            <MenuContainersForm 
              companyId={companyId}
              menuId={menu.id}
              baseCostPrice={cost}
              onSave={handleContainersChange}
            />
          </div>
        ) : (
          <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">용기 사이즈 설정</h3>
              <p className="text-sm text-gray-500 mb-4">
                메뉴를 먼저 생성한 후 용기 사이즈를 설정할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
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