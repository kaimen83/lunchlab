'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CookingPlan, MenuPortion, IngredientRequirement } from '../types';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface CookingPlanResultProps {
  cookingPlan: CookingPlan;
  onPrint: () => void;
  onDownload: () => void;
}

// 메뉴 컨테이너 타입 정의 (API route에서 복사)
interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  ingredients_cost: number;
  menu_container_ingredients: Array<{
    amount: number;
    ingredient: {
      id: string;
      name: string;
      package_amount: number;
      unit: string;
      price: number;
    }
  }>;
  container?: {
    id: string;
    name: string;
  };
}

// 메뉴-용기-식재료 정보를 포함한 확장된 메뉴 정보 타입
interface ExtendedMenuPortion extends MenuPortion {
  mealPlans: string[];
  ingredients?: {
    id: string;
    name: string;
    amount: number;
    unit: string;
  }[];
}

export default function CookingPlanResult({ cookingPlan, onPrint, onDownload }: CookingPlanResultProps) {
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
    // 식단별 식수를 Map으로 저장 (중복 방지)
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
    
    // 식단별 식수의 합계
    const total = Array.from(mealPlanHeadcounts.values()).reduce((sum, count) => sum + count, 0);
    acc[mealTime] = total;
    
    return acc;
  }, {} as Record<string, number>);

  // 메뉴 정보에 식재료 정보를 추가하는 함수
  const getMenuIngredients = (menuId: string, containerId: string | null) => {
    // 해당 메뉴의 메뉴-용기 조합을 찾기 위해 meal_plans의 모든 메뉴를 검색
    for (const mealPlan of cookingPlan.meal_plans) {
      for (const mealPlanMenu of mealPlan.meal_plan_menus) {
        const menu = mealPlanMenu.menu;
        // 해당 메뉴인지 확인
        if (menu.id === menuId) {
          // 해당 용기에 맞는 menu_container 찾기
          const menuContainer = menu.menu_containers?.find(
            (mc: any) => mc.menu_id === menuId && mc.container_id === containerId
          );
          
          if (menuContainer && menuContainer.menu_container_ingredients) {
            // 식재료 정보 추출
            return menuContainer.menu_container_ingredients.map((item: any) => ({
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
  const processedMenusByMealTime = Object.keys(menusByMealTime).reduce((acc, mealTime) => {
    // 메뉴-용기 조합별로 그룹화 (용기별로 다른 식재료를 가질 수 있으므로)
    const menuContainerMap = new Map<string, {
      menu: MenuPortion,
      totalHeadcount: number,
      mealPlans: Set<string>
    }>();
    
    menusByMealTime[mealTime].forEach(menu => {
      // 메뉴-용기 조합을 키로 사용
      const key = `${menu.menu_id}-${menu.container_id || 'null'}`;
      
      // 동일 메뉴-용기 조합이 있는지 확인
      if (menuContainerMap.has(key)) {
        const existingMenu = menuContainerMap.get(key)!;
        // 식수 합산
        existingMenu.totalHeadcount += menu.headcount;
        // 식단 정보 추가 (meal_plan_id가 있을 경우)
        if (menu.meal_plan_id) {
          existingMenu.mealPlans.add(menu.meal_plan_id);
        }
      } else {
        // 새 메뉴-용기 조합 추가
        menuContainerMap.set(key, {
          menu: {...menu},
          totalHeadcount: menu.headcount,
          mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set()
        });
      }
    });
    
    // 통합된 메뉴 목록 생성
    acc[mealTime] = Array.from(menuContainerMap.values()).map(item => {
      // 메뉴-용기 조합에 따른 식재료 정보 추가
      const ingredients = getMenuIngredients(item.menu.menu_id, item.menu.container_id || null);
      
      return {
        ...item.menu,
        headcount: item.totalHeadcount,
        mealPlans: Array.from(item.mealPlans),
        ingredients // 식재료 정보 추가
      } as ExtendedMenuPortion;
    });
    
    return acc;
  }, {} as Record<string, ExtendedMenuPortion[]>);

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

  // 총 식재료 비용 계산
  const totalIngredientsCost = cookingPlan.ingredient_requirements.reduce(
    (sum, item) => sum + item.total_price, 0
  );

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

      <Tabs defaultValue="menu-portions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menu-portions">식단별 식수</TabsTrigger>
          <TabsTrigger value="ingredients">필요 식재료</TabsTrigger>
        </TabsList>
        
        {/* 식단별 식수 탭 */}
        <TabsContent value="menu-portions" className="space-y-4">
          {Object.entries(processedMenusByMealTime).map(([mealTime, menus]) => (
            <Card key={mealTime}>
              <CardHeader>
                <CardTitle>{getMealTimeName(mealTime)} 식단</CardTitle>
                <CardDescription>
                  총 {mealTimeTotals[mealTime] || 0}명
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>메뉴명</TableHead>
                      <TableHead>용기</TableHead>
                      <TableHead>사용 식단</TableHead>
                      <TableHead className="text-right">식수 (명)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menus.map((menuPortion, index) => {
                      // 메뉴-용기 조합의 고유 키
                      const menuKey = `${menuPortion.menu_id}-${menuPortion.container_id || 'null'}`;
                      const isExpanded = expandedMenus[menuKey];
                      
                      return (
                        <Collapsible 
                          key={index} 
                          open={isExpanded}
                          className="w-full"
                        >
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleMenuExpand(menuPortion.menu_id, menuPortion.container_id || null)}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  {isExpanded ? 
                                    <ChevronUp className="h-4 w-4 mr-2 inline text-gray-500" /> : 
                                    <ChevronDown className="h-4 w-4 mr-2 inline text-gray-500" />
                                  }
                                  {menuPortion.menu_name}
                                  {menuPortion.ingredients && menuPortion.ingredients.length > 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      식재료 {menuPortion.ingredients.length}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{menuPortion.container_name || '-'}</TableCell>
                              <TableCell>{getMealPlanNames(menuPortion.mealPlans)}</TableCell>
                              <TableCell className="text-right">{menuPortion.headcount}</TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            {menuPortion.ingredients && menuPortion.ingredients.length > 0 ? (
                              <div className="bg-gray-50 px-4 py-3 border-t border-b">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">식재료 정보</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {menuPortion.ingredients.map((ingredient, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{ingredient.name}</span>
                                      <span className="font-medium">
                                        {formatAmount(ingredient.amount * menuPortion.headcount)} {ingredient.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  * 식수({menuPortion.headcount}명)에 맞게 계산된 수량입니다.
                                </p>
                              </div>
                            ) : (
                              <div className="bg-gray-50 px-4 py-3 border-t border-b">
                                <p className="text-sm text-gray-500">등록된 식재료 정보가 없습니다.</p>
                              </div>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </TableBody>
                </Table>
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
                예상 비용: {formatCurrency(totalIngredientsCost)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>식재료명</TableHead>
                    <TableHead className="text-right">필요 수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">총 비용</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cookingPlan.ingredient_requirements.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                      <TableCell className="text-right">
                        {formatAmount(item.total_amount)} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatUnitPrice(item.unit_price, item.unit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 