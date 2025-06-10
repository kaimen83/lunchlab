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
import { Package, ChevronRight, ChevronLeft, Info, AlertTriangle } from 'lucide-react';
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
  price?: number;
  container_type?: 'group' | 'item'; // 계층 구조 지원
  parent_container_id?: string;
  sort_order?: number;
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
  name: z
    .string()
    .min(1, { message: '메뉴 이름을 입력해주세요.' })
    .max(100, { message: '메뉴 이름은 100자를 초과할 수 없습니다.' }),
  description: z
    .string()
    .max(500, { message: '설명은 500자를 초과할 수 없습니다.' })
    .optional(),
  recipe: z
    .string()
    .max(2000, { message: '조리법은 2000자를 초과할 수 없습니다.' })
    .optional(),
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [selectedContainers, setSelectedContainers] = useState<Container[]>([]);
  const [containerIngredients, setContainerIngredients] = useState<Record<string, ContainerIngredient[]>>({});
  const [cost, setCost] = useState(0);
  const [containers, setContainers] = useState<Container[]>([]);
  const [containerCosts, setContainerCosts] = useState<Record<string, number>>({});

  // 폼 초기화
  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      description: '',
      recipe: '',
    },
  });

  // 중복 체크를 위한 상태 추가
  const [currentMenuName, setCurrentMenuName] = useState<string>('');
  const [initialMenuName, setInitialMenuName] = useState<string>('');
  const [menuNameExists, setMenuNameExists] = useState<boolean>(false);
  const [isCheckingMenuName, setIsCheckingMenuName] = useState<boolean>(false);

  // name 필드 값 변경 감지하여 currentMenuName 상태 업데이트
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name') {
        const menuName = value.name as string;
        setCurrentMenuName(menuName || '');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // 컨테이너 목록 가져오기
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        // flat=true로 플랫 구조 요청하고, 메뉴에서는 개별 용기(item)만 사용 가능
        const response = await fetch(`/api/companies/${companyId}/containers?flat=true`);
        if (!response.ok) {
          throw new Error('용기 목록을 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        
        // 그룹이 아닌 개별 용기(item)만 필터링하여 메뉴에서 사용
        const itemContainers = data.filter((container: any) => container.container_type === 'item');
        
        // 용기 이름을 가나다 순으로 정렬
        const sortedContainers = itemContainers.sort((a: Container, b: Container) => 
          a.name.localeCompare(b.name, 'ko', { numeric: true })
        );
        
        setContainers(sortedContainers);
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
      });
      
      // 초기 메뉴 이름 설정 (중복 체크에서 사용)
      setInitialMenuName(menu.name);
      setCurrentMenuName(menu.name);
      
      // 메뉴에 포함된 식재료 및 컨테이너 조회
      const loadMenuData = async () => {
        try {
          // 식재료 로드
          const ingredientsResponse = await fetch(`/api/companies/${companyId}/menus/${menu.id}/ingredients`);
          if (!ingredientsResponse.ok) {
            throw new Error('식재료 목록을 불러오는데 실패했습니다.');
          }
          const ingredientsData = await ingredientsResponse.json();
          setSelectedIngredients(ingredientsData);
          
          // 용기 및 용기별 식재료 로드
          const containersResponse = await fetch(`/api/companies/${companyId}/menus/${menu.id}/containers`);
          if (!containersResponse.ok) {
            throw new Error('용기 정보를 불러오는데 실패했습니다.');
          }
          const containersData = await containersResponse.json();
          
          // 용기 목록 설정
          const containers = containersData.map((item: any) => item.container);
          setSelectedContainers(containers);
          
          // 용기별 식재료 설정
          const containerIngredientsMap: Record<string, ContainerIngredient[]> = {};
          containersData.forEach((item: any) => {
            const containerId = item.container.id;
            containerIngredientsMap[containerId] = item.ingredients.map((ing: any) => ({
              container_id: containerId,
              ingredient_id: ing.ingredient_id,
              amount: ing.amount
            }));
          });
          
          setContainerIngredients(containerIngredientsMap);
          
          // 모든 데이터가 로드된 후 원가 계산
          const newContainerCosts: Record<string, number> = {};
          let totalCost = 0;
          
          // 각 용기별로 식재료 원가 계산
          Object.entries(containerIngredientsMap).forEach(([containerId, containerItems]) => {
            let containerCost = 0;
            
            // 용기 내 식재료 원가 계산
            containerItems.forEach(item => {
              const ingredient = ingredientsData.find((i: SelectedIngredient) => i.ingredient_id === item.ingredient_id)?.ingredient;
              if (ingredient) {
                containerCost += (item.amount * ingredient.price / ingredient.package_amount);
              }
            });
            
            // 용기 가격 추가
            const container = containers.find((c: Container) => c.id === containerId);
            const containerPrice = container?.price || 0;
            
            // 총 원가 = 식재료 원가 + 용기 가격
            const totalContainerCost = containerCost + containerPrice;
            
            newContainerCosts[containerId] = totalContainerCost;
            totalCost += totalContainerCost;
          });
          
          // 용기별 원가와 총 원가 업데이트
          setContainerCosts(newContainerCosts);
          setCost(totalCost);
        } catch (error) {
          console.error('메뉴 데이터 로드 오류:', error);
          toast({
            title: '오류 발생',
            description: error instanceof Error ? error.message : '메뉴 데이터를 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
        }
      };
      
      loadMenuData();
    } else {
      form.reset({
        name: '',
        description: '',
        recipe: '',
      });
      setSelectedIngredients([]);
      setSelectedContainers([]);
      setContainerIngredients({});
      setCost(0);
      
      // 초기화
      setInitialMenuName('');
      setCurrentMenuName('');
    }
  }, [mode, menu, form, companyId, toast]);
  
  // selectedIngredients 또는 containerIngredients가 변경될 때마다 원가 재계산
  useEffect(() => {
    if (selectedIngredients.length > 0 && Object.keys(containerIngredients).length > 0) {
      updateCostFromContainers(containerIngredients, selectedIngredients);
    }
  }, [selectedIngredients, containerIngredients]);

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

  // 용기별 원가 업데이트 함수
  const updateCostFromContainers = (
    containerIngredientsMap: Record<string, ContainerIngredient[]>,
    ingredients: SelectedIngredient[] = []
  ) => {
    const newContainerCosts: Record<string, number> = {};
    let totalCost = 0;
    
    // 각 용기별로 식재료 원가 계산
    Object.entries(containerIngredientsMap).forEach(([containerId, containerItems]) => {
      let containerCost = 0;
      
      // 용기 내 식재료 원가 계산
      containerItems.forEach(item => {
        const ingredientToUse = ingredients.length > 0 
          ? ingredients 
          : selectedIngredients;
          
        const ingredient = ingredientToUse.find(i => i.ingredient_id === item.ingredient_id)?.ingredient;
        if (ingredient) {
          containerCost += (item.amount * ingredient.price / ingredient.package_amount);
        }
      });
      
      // 용기 가격 추가
      const container = containers.find((c: Container) => c.id === containerId);
      const containerPrice = container?.price || 0;
      
      // 총 원가 = 식재료 원가 + 용기 가격
      const totalContainerCost = containerCost + containerPrice;
      
      // 소수점 첫째자리까지 계산 (반올림)
      newContainerCosts[containerId] = parseFloat(totalContainerCost.toFixed(1));
      totalCost += totalContainerCost;
    });
    
    // 총 원가도 소수점 첫째자리까지 계산 (반올림)
    totalCost = parseFloat(totalCost.toFixed(1));
    
    // 용기별 원가와 총 원가 업데이트
    setContainerCosts(newContainerCosts);
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
      
      // 용기를 추가한 후 원가 재계산
      updateCostFromContainers(newContainerIngredients);
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

  // 실시간 메뉴 이름 중복 체크 함수
  const checkMenuName = async (name: string) => {
    if (!name || name.trim() === '') {
      setMenuNameExists(false);
      form.clearErrors('name');
      return;
    }
    
    // 수정 모드에서 이름이 변경되지 않았다면 중복 체크 필요 없음
    if (mode === 'edit' && name === initialMenuName) {
      setMenuNameExists(false);
      form.clearErrors('name');
      return;
    }
    
    setIsCheckingMenuName(true);
    try {
      // excludeId 파라미터 추가 (편집 모드에서 현재 아이템 제외)
      const excludeIdParam = mode === 'edit' && menu?.id ? `&excludeId=${menu.id}` : '';
      
      // fetch 요청으로 이름 중복 확인
      const response = await fetch(
        `/api/companies/${companyId}/menus/check-name?name=${encodeURIComponent(name)}${excludeIdParam}`
      );
      
      if (!response.ok) {
        console.error('[MenuForm] 메뉴 이름 중복 확인 요청 실패:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('[MenuForm] 메뉴 이름 중복 체크 결과:', data);
      
      // 중복 여부 설정 및 에러 표시
      setMenuNameExists(data.exists);
      
      if (data.exists) {
        form.setError('name', { 
          type: 'manual', 
          message: '이미 사용 중인 메뉴 이름입니다. 다른 이름을 사용해주세요.'
        });
      } else {
        form.clearErrors('name');
      }
    } catch (error) {
      console.error('[MenuForm] 메뉴 이름 체크 오류:', error);
    } finally {
      setIsCheckingMenuName(false);
    }
  };
  
  // 메뉴 이름 변경 시 중복 체크 실행 (디바운스 적용)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentMenuName) {
        checkMenuName(currentMenuName);
      } else {
        setMenuNameExists(false);
        form.clearErrors('name');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentMenuName, companyId, initialMenuName, mode, menu?.id, form]);

  // 폼 제출 처리
  const onSubmit = (data: MenuFormValues) => {
    // 2단계에서 용기가 하나도 선택되지 않았다면 경고
    if (selectedContainers.length === 0) {
      toast({
        title: '용기 필요',
        description: '최소 하나 이상의 용기를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    // 메뉴 이름 중복 확인
    if (menuNameExists) {
      toast({
        title: '이름 중복 오류',
        description: '이미 사용 중인 메뉴 이름입니다. 다른 이름을 사용해주세요.',
        variant: 'destructive',
      });
      setCurrentStep(1); // 첫 단계로 돌아가기
      return;
    }
    
    setIsSubmitting(true);
    
    // API 호출 비동기 함수
    const submitForm = async () => {
      try {
        // 메뉴 기본 정보 및 식재료 구성 데이터
        const menuData = {
          ...data,
          cost: parseFloat(cost.toFixed(1)),
          ingredients: selectedIngredients.map(item => ({
            id: item.ingredient_id,
          })),
          containers: Object.entries(containerIngredients).map(([containerId, ingredients]) => ({
            container_id: containerId,
            ingredients: ingredients.map(ing => ({
              ingredient_id: ing.ingredient_id,
              amount: ing.amount
            }))
          }))
        };
        
        const url = mode === 'create'
          ? `/api/companies/${companyId}/menus`
          : `/api/companies/${companyId}/menus/${menu?.id}`;
        
        // API는 PATCH와 PUT 메서드 모두 지원하도록 변경되었습니다
        const method = mode === 'create' ? 'POST' : 'PATCH';
        
        console.log(`메뉴 ${mode === 'create' ? '생성' : '수정'} 요청 중:`, {
          url,
          method,
          data: menuData
        });
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(menuData),
        });
        
        // 응답이 정상이 아니면 에러 처리
        if (!response.ok) {
          // 응답 본문이 유효한 JSON인지 확인
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || `요청 처리 중 오류가 발생했습니다. (${response.status})`);
          } catch (jsonError) {
            // JSON 파싱 오류가 발생한 경우
            throw new Error(`요청 처리 중 오류가 발생했습니다. (${response.status}): ${response.statusText}`);
          }
        }
        
        // 응답 본문이 유효한 JSON인지 확인
        try {
          const savedMenu = await response.json();
          
          toast({
            title: mode === 'create' ? '메뉴 추가 완료' : '메뉴 수정 완료',
            description: `${savedMenu.name} 메뉴가 ${mode === 'create' ? '추가' : '수정'}되었습니다.`,
            variant: 'default',
          });
          
          onSave(savedMenu);
        } catch (jsonError) {
          console.error('응답 파싱 오류:', jsonError);
          throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
        }
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

  // 1단계 렌더링
  const renderStep1 = () => (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>메뉴 이름</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  {...field} 
                  placeholder="메뉴 이름을 입력하세요" 
                  className={menuNameExists ? "border-red-500 pr-10" : ""}
                  onChange={(e) => {
                    field.onChange(e);
                    console.log('[MenuForm] 메뉴 이름 변경:', e.target.value);
                  }}
                />
                {menuNameExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                )}
              </div>
            </FormControl>
            <div className="mt-1 text-sm">
              {isCheckingMenuName && <p className="text-muted-foreground">메뉴 이름 중복 확인 중...</p>}
            </div>
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
        <Label className="text-blue-800 mb-2 block font-semibold">식재료 선택</Label>
        <p className="text-xs text-blue-600 mb-4">사용할 식재료를 모두 선택하세요. 양은 다음 단계에서 설정합니다.</p>
        
        <MenuIngredientsSelector
          companyId={companyId}
          selectedIngredients={selectedIngredients}
          onChange={handleIngredientsChange}
          amountEditable={false}
        />
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
          type="button"
          onClick={goToNextStep}
        >
          다음 <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </>
  );

  // 2단계 렌더링
  const renderStep2 = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 bg-slate-50 p-4 rounded-md border">
          <h3 className="font-semibold mb-2">용기 선택</h3>
          <p className="text-xs text-slate-600 mb-3">
            메뉴에 사용할 개별 용기를 선택하세요. (그룹은 선택할 수 없습니다)
          </p>
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
                    <CardDescription className="text-xs mt-1 py-1 px-2 bg-blue-50 border-l-2 border-blue-300 rounded flex items-start">
                      <Info className="text-blue-500 mr-1 h-3 w-3 mt-0.5" />
                      {container.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-8">
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
                      <div>
                        <CardTitle className="text-md">{container.name}</CardTitle>
                        <p className="text-sm text-blue-600 font-medium">
                          원가: {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 1 }).format(containerCosts[container.id] || 0)}
                        </p>
                      </div>
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
                      <CardDescription className="text-xs mt-1 py-1 px-2 bg-amber-50 border-l-2 border-amber-300 rounded flex items-start">
                        <Info className="text-amber-500 mr-1 h-3 w-3 mt-0.5" />
                        {container.description}
                      </CardDescription>
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
                                {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 1 }).format(item.ingredient.price)}
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
                                onFocus={(e) => {
                                  if (e.target.value === '0') {
                                    e.target.value = '';
                                  }
                                }}
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