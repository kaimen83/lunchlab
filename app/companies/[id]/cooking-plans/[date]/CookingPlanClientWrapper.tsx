'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import CookingPlanResult from '../components/CookingPlanResult';
import { CookingPlan } from '../types';

interface CookingPlanClientWrapperProps {
  cookingPlan: CookingPlan;
}

export default function CookingPlanClientWrapper({ cookingPlan }: CookingPlanClientWrapperProps) {
  const { toast } = useToast();
  
  // 인쇄 처리
  const handlePrint = () => {
    window.print();
  };

  // 다운로드 처리 (CSV 형식)
  const handleDownload = () => {
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

  // 식사 시간 한글화
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  return (
    <CookingPlanResult 
      cookingPlan={cookingPlan} 
      onPrint={handlePrint} 
      onDownload={handleDownload} 
    />
  );
} 