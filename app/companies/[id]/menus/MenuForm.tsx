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
  FormDescription,
} from '@/components/ui/form';
// 타입 오류를 피하기 위해 바로 import 선언
import MenuIngredientsSelector from './MenuIngredientsSelector';
import { Package, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import ContainersList from './components/ContainersList';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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

// 컨테이너 타입 정의
interface Container {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

// 선택된 식재료 타입 정의
interface SelectedIngredient {
  id?: string;
  menu_id?: string;
  ingredient: Ingredient;
  ingredient_id: string;
  amount: number;
}

// 컨테이너별 식재료 타입 정의
interface ContainerIngredient {
  container_id: string;
  ingredient_id: string;
  amount: number;
}

// 변환 로직을 분리한 단순화된 zod 스키마
const menuSchema = z.object({
  name: z.string().min(1, { message: '메뉴 이름은 필수입니다.' }),
  description: z.string().max(500, { message: '설명은 500자 이하여야 합니다.' }).optional(),
  recipe: z.string().max(2000, { message: '조리법은 2000자 이하여야 합니다.' }).optional(),
  code: z.string().max(50, { message: '코드는 50자 이하여야 합니다.' }).optional(),
});

// 스키마에서 자동으로 타입 추론
type MenuFormValues = z.infer<typeof menuSchema>;

interface Menu {
  id: string;
  name: string;
  cost_price: number;
  description?: string;
  recipe?: string;
  code?: string;
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [selectedContainers, setSelectedContainers] = useState<Container[]>([]);
  const [containerIngredients, setContainerIngredients] = useState<Record<string, ContainerIngredient[]>>({});
  const [cost, setCost] = useState(0);
  const [containers, setContainers] = useState<Container[]>([]);

  // 폼 초기화
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      description: '',
      recipe: '',
      code: '',
    },
  });

  // 컨테이너 목록 가져오기
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}/containers`);
        if (!response.ok) {
          throw new Error('용기 목록을 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setContainers(data);
      } catch (error) {
        console.error('용기 목록 로드 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      }
    };

    fetchContainers();
  }, [companyId, toast]);

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && menu) {
      form.reset({
        name: menu.name,
        description: menu.description || '',
        recipe: menu.recipe || '',
        code: menu.code || '',
      });
      
      // 메뉴에 포함된 식재료 및 컨테이너 조회
      fetchMenuIngredients(menu.id);
      fetchMenuContainers(menu.id);
    } else {
      form.reset({
        name: '',
        description: '',
        recipe: '',
        code: '',
      });
      setSelectedIngredients([]);
      setSelectedContainers([]);
      setContainerIngredients({});
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
    } catch (error) {
      console.error('메뉴 식재료 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 식재료를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 메뉴에 포함된 컨테이너 및 식재료 조회
  const fetchMenuContainers = async (menuId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/${menuId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 용기 목록 설정
      const containers = data.map((item: any) => item.container);
      setSelectedContainers(containers);
      
      // 용기별 식재료 설정
      const containerIngredientsMap: Record<string, ContainerIngredient[]> = {};
      data.forEach((item: any) => {
        const containerId = item.container.id;
        containerIngredientsMap[containerId] = item.ingredients.map((ing: any) => ({
          container_id: containerId,
          ingredient_id: ing.ingredient_id,
          amount: ing.amount
        }));
      });
      
      setContainerIngredients(containerIngredientsMap);
      
      // 원가 계산
      updateCostFromContainers(containerIngredientsMap);
    } catch (error) {
      console.error('메뉴 용기 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 용기 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 용기별 원가 업데이트
  const updateCostFromContainers = (containerIngredientsMap: Record<string, ContainerIngredient[]>) => {
    let totalCost = 0;
    
    // 모든 용기의 식재료 합산
    Object.values(containerIngredientsMap).forEach(ingredients => {
      ingredients.forEach(item => {
        const ingredient = selectedIngredients.find(i => i.ingredient_id === item.ingredient_id)?.ingredient;
        if (ingredient) {
          totalCost += (item.amount * ingredient.price / ingredient.package_amount);
        }
      });
    });
    
    setCost(totalCost);
  };

  // 1단계 식재료 목록 변경 핸들러
  const handleIngredientsChange = (ingredients: SelectedIngredient[]) => {
    setSelectedIngredients(ingredients);
  };

  // 2단계 컨테이너 선택 핸들러
  const handleContainerSelect = (container: Container) => {
    if (!selectedContainers.some(c => c.id === container.id)) {
      setSelectedContainers([...selectedContainers, container]);
      
      // 새 컨테이너에 식재료 초기화
      const newContainerIngredients = { ...containerIngredients };
      newContainerIngredients[container.id] = selectedIngredients.map(item => ({
        container_id: container.id,
        ingredient_id: item.ingredient_id,
        amount: 0 // 초기값은 0
      }));
      
      setContainerIngredients(newContainerIngredients);
    }
  };

  // 컨테이너 제거 핸들러
  const handleContainerRemove = (containerId: string) => {
    setSelectedContainers(selectedContainers.filter(c => c.id !== containerId));
    
    // 컨테이너 식재료 목록에서도 제거
    const newContainerIngredients = { ...containerIngredients };
    delete newContainerIngredients[containerId];
    setContainerIngredients(newContainerIngredients);
    
    // 원가 재계산
    updateCostFromContainers(newContainerIngredients);
  };

  // 컨테이너별 식재료 양 변경 핸들러
  const handleContainerIngredientChange = (
    containerId: string,
    ingredientId: string,
    amount: number
  ) => {
    const newContainerIngredients = { ...containerIngredients };
    
    // 해당 컨테이너의 식재료 목록 찾기
    const containerItems = newContainerIngredients[containerId] || [];
    
    // 해당 식재료 찾기
    const itemIndex = containerItems.findIndex(item => item.ingredient_id === ingredientId);
    
    if (itemIndex >= 0) {
      // 기존 식재료 업데이트
      containerItems[itemIndex].amount = amount;
    } else {
      // 새 식재료 추가
      containerItems.push({
        container_id: containerId,
        ingredient_id: ingredientId,
        amount
      });
    }
    
    newContainerIngredients[containerId] = containerItems;
    setContainerIngredients(newContainerIngredients);
    
    // 원가 재계산
    updateCostFromContainers(newContainerIngredients);
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

  // 다음 단계로 이동
  const goToNextStep = () => {
    // 식재료가 하나도 선택되지 않았다면 경고
    if (selectedIngredients.length === 0) {
      toast({
        title: '식재료 필요',
        description: '최소 하나 이상의 식재료를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setCurrentStep(2);
  };

  // 이전 단계로 이동
  const goToPrevStep = () => {
    setCurrentStep(1);
  };

  // 폼 제출 처리
  const onSubmit = (data: MenuFormValues) => {
    if (selectedIngredients.length === 0) {
      toast({
        title: '식재료 필요',
        description: '메뉴에는 최소 하나 이상의 식재료가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedContainers.length === 0) {
      toast({
        title: '용기 필요',
        description: '메뉴에는 최소 하나 이상의 용기가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    const submitForm = async () => {
      try {
        // 요청 데이터 준비
        const requestData = {
          name: data.name,
          description: data.description,
          recipe: data.recipe,
          code: data.code,
          ingredients: selectedIngredients.map(item => ({
            id: item.ingredient_id
          })),
          containers: selectedContainers.map(container => {
            return {
              container_id: container.id,
              ingredients: containerIngredients[container.id]?.map(item => ({
                ingredient_id: item.ingredient_id,
                amount: item.amount
              })) || []
            };
          })
        };

        // API 요청 URL 선택 (생성 또는 수정)
        const url = mode === 'create' 
          ? `/api/companies/${companyId}/menus`
          : `/api/companies/${companyId}/menus/${menu?.id}`;
        
        // 요청 메서드 (생성 또는 수정)
        const method = mode === 'create' ? 'POST' : 'PUT';
        
        // API 요청 전송
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        // 응답 처리
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '메뉴 저장 중 오류가 발생했습니다.');
        }

        const savedMenu = await response.json();
        
        // 성공 토스트 메시지
        toast({
          title: '성공',
          description: mode === 'create' ? '메뉴가 추가되었습니다.' : '메뉴가 수정되었습니다.',
        });
        
        // 콜백 호출
        onSave(savedMenu);
      } catch (error) {
        console.error('메뉴 저장 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '메뉴를 저장하는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    submitForm();
  };

  // 1단계 렌더링
  const renderStep1 = () => (
    <form onSubmit={form.handleSubmit(goToNextStep)} className="space-y-6">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메뉴 이름 *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="메뉴명을 입력하세요" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메뉴 코드</FormLabel>
              <FormControl>
                <Input {...field} placeholder="메뉴 식별 코드 (예: M001, 스파게티-1)" />
              </FormControl>
              <FormMessage />
              <FormDescription>
                메뉴를 구분하는데 사용되는 고유 코드입니다. 선택사항입니다.
              </FormDescription>
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
                  rows={3}
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
          <Label className="text-blue-800 mb-2 block font-semibold">식재료 선택</Label>
          <p className="text-xs text-blue-600 mb-4">사용할 식재료를 모두 선택하세요. 양은 다음 단계에서 설정합니다.</p>
          
          <MenuIngredientsSelector
            companyId={companyId}
            selectedIngredients={selectedIngredients}
            onChange={handleIngredientsChange}
            amountEditable={false}
          />
        </div>
      </div>

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
  );

  // 2단계 렌더링
  const renderStep2 = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 bg-slate-50 p-4 rounded-md border">
          <h3 className="font-semibold mb-2">용기 선택</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {containers.map(container => (
              <Card key={container.id} className="cursor-pointer hover:bg-slate-100 transition-colors">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm flex justify-between">
                    {container.name}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleContainerSelect(container)}
                      disabled={selectedContainers.some(c => c.id === container.id)}
                    >
                      {selectedContainers.some(c => c.id === container.id) ? '추가됨' : '추가'}
                    </Button>
                  </CardTitle>
                  {container.description && (
                    <CardDescription className="text-xs">{container.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-8">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-blue-800">총 원가 계산</Label>
              <div className="text-lg font-semibold text-blue-800">
                {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(cost)}
              </div>
            </div>
            <p className="text-xs text-blue-600">각 용기별 식재료 양에 따라 자동으로 계산됩니다.</p>
          </div>
          
          <h3 className="font-semibold mb-2">선택한 용기별 식재료 양 설정</h3>
          {selectedContainers.length === 0 ? (
            <div className="bg-slate-100 p-4 rounded-md text-center text-slate-500">
              용기를 선택해주세요
            </div>
          ) : (
            <div className="space-y-4">
              {selectedContainers.map(container => (
                <Card key={container.id} className="border border-slate-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md">{container.name}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 h-8 px-2 py-0" 
                        onClick={() => handleContainerRemove(container.id)}
                      >
                        제거
                      </Button>
                    </div>
                    {container.description && (
                      <CardDescription>{container.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedIngredients.map(item => {
                        const containerIngredient = containerIngredients[container.id]?.find(
                          i => i.ingredient_id === item.ingredient_id
                        );
                        
                        return (
                          <div key={item.ingredient_id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.ingredient.name}</p>
                              <p className="text-xs text-slate-500">
                                {item.ingredient.package_amount} {item.ingredient.unit} / 
                                {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.ingredient.price)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-20"
                                value={containerIngredient?.amount || 0}
                                onChange={(e) => handleContainerIngredientChange(
                                  container.id,
                                  item.ingredient_id,
                                  parseFloat(e.target.value)
                                )}
                              />
                              <span className="text-sm w-10">{item.ingredient.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={goToPrevStep}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> 이전
        </Button>
        <div className="flex gap-2">
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
      </div>
    </>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 단계 표시 */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <div className="flex gap-4">
            <div className={`px-4 py-2 rounded-full font-medium ${currentStep === 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
              1. 기본 정보
            </div>
            <div className={`px-4 py-2 rounded-full font-medium ${currentStep === 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}>
              2. 용기별 식재료
            </div>
          </div>
        </div>
        
        {currentStep === 1 ? renderStep1() : renderStep2()}
      </form>
    </Form>
  );
} 