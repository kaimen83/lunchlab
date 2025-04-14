'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import CookingPlanForm from './CookingPlanForm';
import CookingPlanResult from './CookingPlanResult';
import { CookingPlan, CookingPlanFormData } from '../types';

interface CookingPlanContainerProps {
  companyId: string;
}

export default function CookingPlanContainer({ companyId }: CookingPlanContainerProps) {
  const { toast } = useToast();
  const [cookingPlan, setCookingPlan] = useState<CookingPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  // 다운로드 처리 (CSV 형식)
  const handleDownload = () => {
    if (!cookingPlan) return;
    
    try {
      // 메뉴별 식수 CSV 데이터 생성
      let menuCsv = '식사시간,메뉴ID,메뉴명,용기명,식수\n';
      
      cookingPlan.menu_portions.forEach(item => {
        const mealTime = getMealTimeName(item.meal_time || '기타');
        menuCsv += `${mealTime},${item.menu_id},${item.menu_name},${item.container_name || ''},${item.headcount}\n`;
      });
      
      // 식재료 CSV 데이터 생성
      let ingredientsCsv = '식재료ID,식재료명,단위,필요량,단가,총 비용\n';
      
      cookingPlan.ingredient_requirements.forEach(item => {
        ingredientsCsv += `${item.ingredient_id},${item.ingredient_name},${item.unit},${item.total_amount},${item.unit_price},${item.total_price}\n`;
      });
      
      // 파일 생성 및 다운로드 - 메뉴
      const menuBlob = new Blob([menuCsv], { type: 'text/csv;charset=utf-8;' });
      const menuUrl = URL.createObjectURL(menuBlob);
      const menuLink = document.createElement('a');
      menuLink.href = menuUrl;
      menuLink.setAttribute('download', `조리계획서_메뉴_${cookingPlan.date}.csv`);
      document.body.appendChild(menuLink);
      menuLink.click();
      
      // 파일 생성 및 다운로드 - 식재료
      const ingredientsBlob = new Blob([ingredientsCsv], { type: 'text/csv;charset=utf-8;' });
      const ingredientsUrl = URL.createObjectURL(ingredientsBlob);
      const ingredientsLink = document.createElement('a');
      ingredientsLink.href = ingredientsUrl;
      ingredientsLink.setAttribute('download', `조리계획서_식재료_${cookingPlan.date}.csv`);
      document.body.appendChild(ingredientsLink);
      ingredientsLink.click();
      
      // 임시 요소 제거
      document.body.removeChild(menuLink);
      document.body.removeChild(ingredientsLink);
      
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
  };

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
        />
      )}
    </div>
  );
} 