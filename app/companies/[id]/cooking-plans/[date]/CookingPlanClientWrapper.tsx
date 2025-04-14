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
      // 안전하게 파일 다운로드하는 함수
      const downloadCSV = (csvContent: string, filename: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 링크 생성
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        
        // 링크를 DOM에 추가하지 않고 직접 클릭 이벤트 발생
        link.style.visibility = 'hidden';
        link.click();
        
        // URL 객체 해제
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      };

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
      
      // 파일 다운로드 실행
      downloadCSV(menuCsv, `조리계획서_메뉴_${cookingPlan.date}.csv`);
      downloadCSV(ingredientsCsv, `조리계획서_식재료_${cookingPlan.date}.csv`);
      
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