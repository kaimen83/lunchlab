'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import CookingPlanForm from './CookingPlanForm';
import CookingPlanResult from './CookingPlanResult';
import { CookingPlan, CookingPlanFormData } from '../types';

interface CookingPlanContainerProps {
  companyId: string;
  initialDate?: string;
  onComplete?: () => void;
}

export default function CookingPlanContainer({ companyId, initialDate, onComplete }: CookingPlanContainerProps) {
  const { toast } = useToast();
  const [cookingPlan, setCookingPlan] = useState<CookingPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 현재 컴포넌트가 마운트된 상태인지 추적
  const isMountedRef = useRef<boolean>(true);
  
  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 식사 시간 한글화
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  // 조리계획서 생성 폼 제출 처리
  const handleFormSubmit = async (data: CookingPlanFormData) => {
    setIsLoading(true);
    
    try {
      // 1. 식수 계획 저장 API 호출
      const response = await fetch(`/api/companies/${companyId}/cooking-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '조리계획서 생성 중 오류가 발생했습니다.');
      }
      
      // 2. 생성된 조리계획서 데이터 가져오기
      const fetchResponse = await fetch(`/api/companies/${companyId}/cooking-plans?date=${data.date}`);
      
      if (!fetchResponse.ok) {
        throw new Error('조리계획서 정보를 불러오는데 실패했습니다.');
      }
      
      const cookingPlanData = await fetchResponse.json();
      setCookingPlan(cookingPlanData);
      
      // 완료 콜백 함수 호출
      if (onComplete) {
        onComplete();
      }
      
    } catch (error) {
      console.error('조리계획서 생성 오류:', error);
      toast({
        title: '조리계획서 생성 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 인쇄 처리
  const handlePrint = () => {
    window.print();
  };

  // 다운로드 처리를 별도 함수로 분리
  const downloadCSV = useCallback((csvContent: string, filename: string) => {
    if (!isMountedRef.current) return;
    
    try {
      // 데이터 URI를 사용한 다운로드 방식 (DOM 요소 추가/제거 없음)
      const encodedCsv = encodeURIComponent(csvContent);
      const dataUri = `data:text/csv;charset=utf-8,${encodedCsv}`;
      
      // 가상 링크 생성 및 클릭 (DOM에 추가하지 않음)
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      link.click();
    } catch (error) {
      console.error('다운로드 오류:', error);
    }
  }, [isMountedRef]);

  // 다운로드 처리 (CSV 형식)
  const handleDownload = useCallback(() => {
    if (!cookingPlan || !isMountedRef.current) return;
    
    try {
      // 메뉴별로 중복을 합치고 식단 정보 추가
      const processMenus = () => {
        // 식사 시간별로 그룹화
        const menusByMealTime = cookingPlan.menu_portions.reduce((acc, menu) => {
          const mealTime = menu.meal_time || '기타';
          
          if (!acc[mealTime]) {
            acc[mealTime] = [];
          }
          acc[mealTime].push(menu);
          
          return acc;
        }, {} as Record<string, typeof cookingPlan.menu_portions>);
        
        // 식사 시간별로 중복 메뉴 통합
        return Object.entries(menusByMealTime).flatMap(([mealTime, menus]) => {
          // 메뉴 ID별로 그룹화
          const menuMap = new Map<string, {
            menu: typeof menus[0],
            totalHeadcount: number,
            mealPlans: Set<string>
          }>();
          
          menus.forEach(menu => {
            if (menuMap.has(menu.menu_id)) {
              const existingMenu = menuMap.get(menu.menu_id)!;
              existingMenu.totalHeadcount += menu.headcount;
              if (menu.meal_plan_id) {
                existingMenu.mealPlans.add(menu.meal_plan_id);
              }
            } else {
              menuMap.set(menu.menu_id, {
                menu: {...menu},
                totalHeadcount: menu.headcount,
                mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set()
              });
            }
          });
          
          // 통합된 메뉴 목록 생성
          return Array.from(menuMap.values()).map(item => ({
            ...item.menu,
            headcount: item.totalHeadcount,
            mealPlans: Array.from(item.mealPlans)
          }));
        });
      };
      
      // 식단 ID를 식단명으로 변환
      const getMealPlanNames = (mealPlanIds: string[]) => {
        if (!mealPlanIds.length) return '';
        
        const mealPlanNames = mealPlanIds.map(id => {
          const mealPlan = cookingPlan.meal_plans.find(mp => mp.id === id);
          return mealPlan?.name || id;
        });
        
        return mealPlanNames.join(', ');
      };
      
      // 메뉴별 식수 CSV 데이터 생성
      const processedMenus = processMenus();
      let menuCsv = '식사시간,메뉴ID,메뉴명,용기명,사용 식단,식수\n';
      
      processedMenus.forEach(item => {
        const mealTime = getMealTimeName(item.meal_time || '기타');
        const mealPlans = 'mealPlans' in item ? getMealPlanNames((item as any).mealPlans) : '';
        menuCsv += `${mealTime},${item.menu_id},${item.menu_name},${item.container_name || ''},${mealPlans},${item.headcount}\n`;
      });
      
      // 식재료 CSV 데이터 생성
      let ingredientsCsv = '식재료ID,식재료명,단위,필요량,단가,총 원가\n';
      
      cookingPlan.ingredient_requirements.forEach(item => {
        // 단가를 "금액/단위" 형식으로 표시
        const unitPrice = `${item.unit_price.toLocaleString()}원/${item.unit}`;
        ingredientsCsv += `${item.ingredient_id},${item.ingredient_name},${item.unit},${item.total_amount},${unitPrice},${item.total_price.toLocaleString()}원\n`;
      });
      
      // 메뉴 CSV 다운로드
      downloadCSV(menuCsv, `조리계획서_메뉴_${cookingPlan.date}.csv`);
      
      // 약간의 지연 후 식재료 CSV 다운로드
      setTimeout(() => {
        if (isMountedRef.current) {
          downloadCSV(ingredientsCsv, `조리계획서_식재료_${cookingPlan.date}.csv`);
        }
      }, 500); // 더 긴 지연 시간 사용
      
      toast({
        title: '다운로드 완료',
        description: '조리계획서 파일이 다운로드되었습니다.',
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        title: '다운로드 실패',
        description: '파일 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  }, [cookingPlan, isMountedRef, getMealTimeName, downloadCSV, toast]);

  // 다시 작성
  const handleReset = () => {
    setCookingPlan(null);
  };

  return (
    <div>
      {cookingPlan ? (
        <div className="space-y-4">
          <CookingPlanResult 
            cookingPlan={cookingPlan} 
            onPrint={handlePrint} 
            onDownload={handleDownload} 
          />
          <div className="flex justify-center mt-8">
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              다시 작성하기
            </button>
          </div>
        </div>
      ) : (
        <CookingPlanForm
          companyId={companyId}
          onSubmit={handleFormSubmit}
          initialDate={initialDate}
        />
      )}
    </div>
  );
} 