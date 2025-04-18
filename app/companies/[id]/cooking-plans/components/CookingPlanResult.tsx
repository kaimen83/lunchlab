'use client';

import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CookingPlan, MenuPortion, IngredientRequirement } from '../types';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface CookingPlanResultProps {
  cookingPlan: CookingPlan;
  onPrint: () => void;
  onDownload: () => void;
  onTabChange?: (value: string) => void;
  activeTab?: 'menu-portions' | 'ingredients';
}

// 식재료 타입 정의
interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
}

// 메뉴-용기-식재료 관계 타입 정의
interface MenuContainerIngredient {
  amount: number;
  ingredient: Ingredient;
}

// 메뉴 컨테이너 타입 정의
interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  ingredients_cost: number;
  menu_container_ingredients: MenuContainerIngredient[];
  container?: {
    id: string;
    name: string;
  };
}

// 메뉴 타입 정의
interface Menu {
  id: string;
  name: string;
  description?: string;
  menu_price_history?: any[];
  menu_containers?: MenuContainer[];
}

// 식단 메뉴 타입 정의
interface MealPlanMenu {
  menu: Menu;
  container?: {
    id: string;
    name: string;
    description?: string;
    price?: number;
  };
}

// 확장된 메뉴와 컨테이너 정보
interface ExtendedContainerInfo {
  name: string;
  headcount: number;
}

// 확장된 식재료 정보
interface ExtendedIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  containerName?: string | null;
  headcount?: number;
}

// 메뉴-용기-식재료 정보를 포함한 확장된 메뉴 정보 타입
interface ExtendedMenuPortion extends MenuPortion {
  mealPlans: string[];
  container_names: string[];
  containers_info: ExtendedContainerInfo[];
  ingredients?: ExtendedIngredient[];
}

// 메뉴 컨테이너 타입 정의에서 용기 정보 인터페이스 추가
interface ContainerInfo {
  headcount: number, 
  containerName: string | null,
  mealPlans: Set<string>,
  ingredients: {
    id: string;
    name: string;
    amount: number;
    unit: string;
  }[] | undefined
}

export default function CookingPlanResult({ cookingPlan, onPrint, onDownload, onTabChange, activeTab = 'menu-portions' }: CookingPlanResultProps) {
  // 메뉴 확장 상태 관리
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // 메뉴 확장 상태 토글
  const toggleMenuExpand = (menuId: string, containerId: string | null) => {
    const key = `${menuId}-${containerId || 'null'}`;
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 식사 시간별로 그룹화
  const menusByMealTime = cookingPlan.menu_portions.reduce((acc, menu) => {
    // meal_time이 없을 경우 '기타'로 처리
    const mealTime = menu.meal_time || '기타';
    
    if (!acc[mealTime]) {
      acc[mealTime] = [];
    }
    acc[mealTime].push(menu);
    
    return acc;
  }, {} as Record<string, MenuPortion[]>);

  // 식사 시간별 총 식수 계산 (식단별로 중복없이 합산)
  const mealTimeTotals = Object.keys(menusByMealTime).reduce((acc, mealTime) => {
    // 조리지시서를 Map으로 저장 (중복 방지)
    const mealPlanHeadcounts = new Map<string, number>();
    
    menusByMealTime[mealTime].forEach(menu => {
      // meal_plan_id가 있는 경우에만 처리
      if (menu.meal_plan_id) {
        mealPlanHeadcounts.set(menu.meal_plan_id, menu.headcount);
      } else {
        // meal_plan_id가 없는 경우 menu_id를 키로 사용
        mealPlanHeadcounts.set(menu.menu_id, menu.headcount);
      }
    });
    
    // 조리지시서의 합계
    const total = Array.from(mealPlanHeadcounts.values()).reduce((sum, count) => sum + count, 0);
    acc[mealTime] = total;
    
    return acc;
  }, {} as Record<string, number>);

  // 메뉴 정보에 식재료 정보를 추가하는 함수
  const getMenuIngredients = (menuId: string, containerId: string | null) => {
    // 해당 메뉴의 메뉴-용기 조합을 찾기 위해 meal_plans의 모든 메뉴를 검색
    for (const mealPlan of cookingPlan.meal_plans) {
      // meal_plan_menus가 없는 경우 스킵
      if (!mealPlan.meal_plan_menus) continue;
      
      for (const mealPlanMenu of mealPlan.meal_plan_menus) {
        const menu = mealPlanMenu.menu as Menu;
        // 해당 메뉴인지 확인
        if (menu.id === menuId) {
          // menu_containers가 없는 경우 스킵
          if (!menu.menu_containers) continue;
          
          // 해당 용기에 맞는 menu_container 찾기
          const menuContainer = menu.menu_containers.find(
            (mc: MenuContainer) => mc.menu_id === menuId && mc.container_id === containerId
          );
          
          if (menuContainer && menuContainer.menu_container_ingredients) {
            // 식재료 정보 추출
            return menuContainer.menu_container_ingredients.map((item) => ({
              id: item.ingredient.id,
              name: item.ingredient.name,
              amount: item.amount,
              unit: item.ingredient.unit
            }));
          }
        }
      }
    }
    return [];
  };

  // 식사 시간별로 중복 메뉴를 통합하고 식단 정보 추가
  const processedMenusByMealTime = Object.keys(menusByMealTime).reduce<Record<string, ExtendedMenuPortion[]>>((acc, mealTime) => {
    // 메뉴별로 그룹화 (동일 메뉴명은 같은 행으로 통합)
    const menuMap = new Map<string, {
      menu: MenuPortion,
      containers: Map<string, ContainerInfo>
    }>();
    
    menusByMealTime[mealTime].forEach(menu => {
      const menuName = menu.menu_name;
      
      // 동일 메뉴가 있는지 확인
      if (menuMap.has(menuName)) {
        const existingMenu = menuMap.get(menuName)!;
        
        // 해당 용기가 있는지 확인
        const containerKey = menu.container_id || 'null';
        
        if (existingMenu.containers.has(containerKey)) {
          // 기존 용기에 식수 추가
          const container = existingMenu.containers.get(containerKey)!;
          container.headcount += menu.headcount;
          
          // 식단 정보 추가 (meal_plan_id가 있을 경우)
          if (menu.meal_plan_id) {
            container.mealPlans.add(menu.meal_plan_id);
          }
        } else {
          // 새 용기 추가
          const ingredients = getMenuIngredients(menu.menu_id, menu.container_id || null);
          
          existingMenu.containers.set(containerKey, {
            headcount: menu.headcount,
            containerName: menu.container_name ?? null, // undefined이면 null로 처리
            mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set(),
            ingredients
          });
        }
      } else {
        // 새 메뉴 추가
        const ingredients = getMenuIngredients(menu.menu_id, menu.container_id || null);
        
        const containers = new Map<string, ContainerInfo>();
        
        containers.set(menu.container_id || 'null', {
          headcount: menu.headcount,
          containerName: menu.container_name ?? null, // undefined이면 null로 처리
          mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set(),
          ingredients
        });
        
        menuMap.set(menuName, {
          menu: {...menu},
          containers
        });
      }
    });
    
    // 통합된 메뉴 목록 생성
    acc[mealTime] = Array.from(menuMap.entries()).map(([menuName, item]) => {
      // 용기별 정보 생성
      const containers = Array.from(item.containers.values());
      const containersInfo: ExtendedContainerInfo[] = containers.map(container => ({
        name: container.containerName || '기본',
        headcount: container.headcount
      }));
      
      // 용기명 목록
      const containerNames: string[] = [];
      containers.forEach(container => {
        if (container.containerName) {
          containerNames.push(container.containerName);
        }
      });
      
      // 식단 ID 목록
      const mealPlanIds = Array.from(
        new Set(
          containers.flatMap(container => 
            Array.from(container.mealPlans)
          )
        )
      );
      
      // 식재료 목록 취합 (중복 식재료는 수량 합산)
      const ingredientMap = new Map<string, ExtendedIngredient>();
      
      containers.forEach(container => {
        if (container.ingredients && container.ingredients.length > 0) {
          container.ingredients.forEach(ingredient => {
            const key = ingredient.id;
            
            if (ingredientMap.has(key)) {
              // 기존 식재료가 있으면 수량 합산
              const existingIngredient = ingredientMap.get(key)!;
              existingIngredient.amount += ingredient.amount * container.headcount;
            } else {
              // 새 식재료 추가
              ingredientMap.set(key, {
                ...ingredient,
                containerName: container.containerName,
                headcount: container.headcount,
                amount: ingredient.amount * container.headcount
              });
            }
          });
        }
      });
      
      // 합산된 식재료 목록으로 변환
      const allIngredients = Array.from(ingredientMap.values());
      
      // 전체 식수 계산
      const totalHeadcount = containers.reduce((sum, container) => sum + container.headcount, 0);
      
      return {
        ...item.menu,
        menu_name: menuName,
        container_names: containerNames,
        containers_info: containersInfo,
        headcount: totalHeadcount,
        mealPlans: mealPlanIds,
        ingredients: allIngredients
      } as ExtendedMenuPortion;
    });
    
    return acc;
  }, {});

  // 식사 시간 한글화
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  // 금액 포맷
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 단가 포맷 (원/단위 형태로 표시)
  const formatUnitPrice = (unitPrice: number, unit: string) => {
    // 통화 형식으로 포맷
    const formattedPrice = new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(unitPrice);
    
    // 단위 추가 (예: "1,000원/g")
    return `${formattedPrice}/${unit}`;
  };

  // 수량 포맷
  const formatAmount = (amount: number) => {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
  };

  // 식재료 양 포맷 (g -> kg 변환)
  const formatIngredientAmount = (amount: number, unit: string) => {
    // g 단위일 경우 kg으로 변환
    if (unit === 'g' && amount >= 1000) {
      const kgAmount = amount / 1000;
      return `${kgAmount % 1 === 0 ? kgAmount.toString() : kgAmount.toFixed(1)}kg`;
    }
    // 그 외 단위는 그대로 표시
    return `${formatAmount(amount)} ${unit}`;
  };

  // 식단 ID를 식단명으로 변환하는 함수
  const getMealPlanNames = (mealPlanIds: string[]) => {
    if (!mealPlanIds.length) return '-';
    
    // 식단 ID에 해당하는 식단 찾기
    const mealPlanNames = mealPlanIds.map(id => {
      const mealPlan = cookingPlan.meal_plans.find(mp => mp.id === id);
      return mealPlan?.name || id;
    });
    
    return mealPlanNames.join(', ');
  };

  // 총 식재료 원가 계산
  const totalIngredientsCost = cookingPlan.ingredient_requirements.reduce(
    (sum, item) => sum + item.total_price, 0
  );

  // 식수 포맷 (용기별로 구분)
  const formatHeadcounts = (containersInfo: ExtendedContainerInfo[]) => {
    // 용기가 하나인 경우 식수만 표시
    if (containersInfo.length === 1) {
      return `${containersInfo[0].headcount}명`;
    }
    
    // 용기가 여러 개인 경우 '용기명: 식수' 형식으로 표시
    return containersInfo.map(info => `${info.name}: ${info.headcount}명`).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <FileText className="mr-2 h-6 w-6" />
            조리계획서
          </h2>
          <p className="text-gray-500 mt-1">
            {format(new Date(cookingPlan.date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            다운로드
          </Button>
        </div>
      </div>

      <Tabs defaultValue="menu-portions" value={activeTab} onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menu-portions">조리지시서</TabsTrigger>
          <TabsTrigger value="ingredients">필요 식재료</TabsTrigger>
        </TabsList>
        
        {/* 조리지시서 탭 */}
        <TabsContent value="menu-portions" className="space-y-4">
          {Object.entries(processedMenusByMealTime).map(([mealTime, menus]) => (
            <Card key={mealTime}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Badge variant="outline" className="mr-2 py-1 px-2 bg-blue-50">
                    {getMealTimeName(mealTime)}
                  </Badge>
                  <span>식단</span> 
                  <Badge variant="secondary" className="ml-auto text-sm">
                    총 {mealTimeTotals[mealTime] || 0}명
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="w-full border-collapse">
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-sm w-[14%]">메뉴명</TableHead>
                        <TableHead className="font-semibold text-sm w-[14%]">사용 식단</TableHead>
                        <TableHead className="font-semibold text-sm w-[10%]">용기</TableHead>
                        <TableHead className="font-semibold text-sm w-[8%]">식수</TableHead>
                        <TableHead className="font-semibold text-sm w-[10%]">품목코드</TableHead>
                        <TableHead className="font-semibold text-sm w-[10%]">필요 식재료</TableHead>
                        <TableHead className="font-semibold text-sm text-right w-[10%]">포장단위</TableHead>
                        <TableHead className="font-semibold text-sm text-right w-[14%]">투입량(pac)</TableHead>
                        <TableHead className="font-semibold text-sm text-right w-[10%]">식재료 양</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menus.map((menuPortion, index) => {
                        // 식재료가 있는 경우
                        if (menuPortion.ingredients && menuPortion.ingredients.length > 0) {
                          return menuPortion.ingredients.map((ingredient, idx) => {
                            // 해당 식재료의 포장단위 정보 찾기
                            const ingredientReq = cookingPlan.ingredient_requirements.find(
                              item => item.ingredient_id === ingredient.id
                            );
                            
                            // 포장단위 정보 가져오기
                            const packageAmount = ingredientReq?.package_amount;
                            
                            // 투입량 계산 (필요 수량 / 포장단위)
                            // 포장단위 정보가 없거나 0이면 투입량 계산 불가능
                            const unitsRequired = packageAmount ? 
                              (ingredient.amount / packageAmount).toFixed(1) : 
                              "포장단위 정보 없음";
                              
                            return (
                              <TableRow 
                                key={`${index}-${idx}`} 
                                className={`
                                  ${idx > 0 ? "border-t-0" : ""}
                                  ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}
                                  hover:bg-blue-50/20 transition-colors
                                `}
                              >
                                {idx === 0 && (
                                  <>
                                    <TableCell className="font-medium align-top" rowSpan={menuPortion.ingredients!.length}>
                                      {menuPortion.menu_name}
                                    </TableCell>
                                    <TableCell className="align-top" rowSpan={menuPortion.ingredients!.length}>
                                      {getMealPlanNames(menuPortion.mealPlans)}
                                    </TableCell>
                                    <TableCell className="align-top" rowSpan={menuPortion.ingredients!.length}>
                                      {menuPortion.container_names.length > 0 
                                        ? menuPortion.container_names.map((name, i) => (
                                            <Badge key={i} variant="outline" className="mr-1 mb-1">
                                              {name}
                                            </Badge>
                                          ))
                                        : '-'}
                                    </TableCell>
                                    <TableCell className="align-top" rowSpan={menuPortion.ingredients!.length}>
                                      <Badge variant="secondary" className="font-medium">
                                        {formatHeadcounts(menuPortion.containers_info)}
                                      </Badge>
                                    </TableCell>
                                  </>
                                )}
                                <TableCell className="text-sm text-gray-600">
                                  {ingredientReq?.code_name || "-"}
                                </TableCell>
                                <TableCell className="border-l-0">
                                  <span className="text-sm">{ingredient.name}</span>
                                </TableCell>
                                <TableCell className="text-right text-sm text-gray-600">
                                  {packageAmount ? `${packageAmount} ${ingredient.unit}` : "-"}
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm">
                                  {unitsRequired}
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm">
                                  {formatIngredientAmount(ingredient.amount, ingredient.unit)}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        } else {
                          // 식재료가 없는 경우
                          return (
                            <TableRow 
                              key={index}
                              className={`
                                ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}
                                hover:bg-blue-50/20 transition-colors
                              `}
                            >
                              <TableCell className="font-medium">
                                {menuPortion.menu_name}
                              </TableCell>
                              <TableCell>{getMealPlanNames(menuPortion.mealPlans)}</TableCell>
                              <TableCell>
                                {menuPortion.container_names.length > 0 
                                  ? menuPortion.container_names.map((name, i) => (
                                      <Badge key={i} variant="outline" className="mr-1 mb-1">
                                        {name}
                                      </Badge>
                                    ))
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-medium">
                                  {formatHeadcounts(menuPortion.containers_info)}
                                </Badge>
                              </TableCell>
                              <TableCell colSpan={5} className="text-center text-gray-500 text-sm italic">
                                등록된 식재료 정보가 없습니다.
                              </TableCell>
                            </TableRow>
                          );
                        }
                      })}
                      {menus.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                            등록된 메뉴가 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <p>* 식재료 수량은 각 메뉴의 식수에 맞게 계산된 값입니다.</p>
                  <p>* 포장단위는 식재료 마스터에 등록된 정보입니다. 정보가 없는 경우 "-"로 표시됩니다.</p>
                  <p>* 투입량은 필요 수량을 포장단위로 나눈 값입니다. 포장단위가 없으면 계산할 수 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* 필요 식재료 탭 */}
        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>필요 식재료 목록</CardTitle>
              <CardDescription>
                총 {cookingPlan.ingredient_requirements.length}개 품목 / 
                예상 원가: {formatCurrency(totalIngredientsCost)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>식재료명</TableHead>
                    <TableHead>품목코드</TableHead>
                    <TableHead className="text-right">필요 수량</TableHead>
                    <TableHead className="text-right">포장단위</TableHead>
                    <TableHead className="text-right">투입량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">총 원가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookingPlan.ingredient_requirements.map((item, index) => {
                    // 식재료 포장단위 정보 가져오기
                    const packageAmount = item.package_amount;
                    
                    // 투입량 계산 (필요 수량 / 포장단위)
                    // 포장단위 정보가 없거나 0이면 투입량 계산 불가능
                    const unitsRequired = packageAmount ? 
                      (item.total_amount / packageAmount).toFixed(1) : 
                      "포장단위 정보 없음";
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                        <TableCell>{item.code_name || "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatIngredientAmount(item.total_amount, item.unit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {packageAmount ? `${packageAmount} ${item.unit}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {unitsRequired}
                        </TableCell>
                        <TableCell className="text-right">{formatUnitPrice(item.unit_price, item.unit)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-gray-500 mt-2">
                * 포장단위는 식재료 마스터에 등록된 정보입니다. 정보가 없는 경우 "-"로 표시됩니다.
              </p>
              <p className="text-xs text-gray-500">
                * 투입량은 필요 수량을 포장단위로 나눈 값입니다. 포장단위가 없으면 계산할 수 없습니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 