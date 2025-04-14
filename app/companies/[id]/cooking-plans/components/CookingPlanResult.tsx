'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CookingPlan, MenuPortion, IngredientRequirement } from '../types';

interface CookingPlanResultProps {
  cookingPlan: CookingPlan;
  onPrint: () => void;
  onDownload: () => void;
}

export default function CookingPlanResult({ cookingPlan, onPrint, onDownload }: CookingPlanResultProps) {
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

  // 수량 포맷
  const formatAmount = (amount: number) => {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
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
          {Object.entries(menusByMealTime).map(([mealTime, menus]) => (
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
                      <TableHead className="text-right">식수 (명)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menus.map((menuPortion, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{menuPortion.menu_name}</TableCell>
                        <TableCell>{menuPortion.container_name || '-'}</TableCell>
                        <TableCell className="text-right">{menuPortion.headcount}</TableCell>
                      </TableRow>
                    ))}
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
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
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