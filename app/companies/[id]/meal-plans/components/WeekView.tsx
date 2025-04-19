import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { MealPlan } from '../types';
import { calculateMealPlanCost, formatCurrency, getMealPlansByDate, getMenuNames } from '../utils';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';

interface WeekViewProps {
  daysOfWeek: Date[];
  mealPlans: MealPlan[];
  companyId: string;
  onViewMealPlan: (mealPlan: MealPlan) => void;
  onAddMealPlan: (date: Date, mealTime: 'breakfast' | 'lunch' | 'dinner') => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  daysOfWeek,
  mealPlans,
  companyId,
  onViewMealPlan,
  onAddMealPlan
}) => {
  // 식단 이름(템플릿)별로 그룹화
  const templateGroups = useMemo(() => {
    // 식단 이름(템플릿) 목록 생성 (중복 제거)
    const templateNames = [...new Set(mealPlans.map(plan => plan.name))].sort();
    return templateNames;
  }, [mealPlans]);

  // 식단 카드 렌더링
  const renderMealPlanCard = (mealPlan: MealPlan) => (
    <div 
      key={mealPlan.id} 
      className="p-2 rounded-md cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150"
      onClick={() => onViewMealPlan(mealPlan)}
    >
      <div className="flex justify-between items-center mb-0.5">
        <div className="text-xs font-semibold text-blue-600 whitespace-nowrap">
          {getMealTimeName(mealPlan.meal_time)}
        </div>
        <div className="text-xs font-semibold text-blue-600 whitespace-nowrap">
          {formatCurrency(calculateMealPlanCost(mealPlan))}
        </div>
      </div>
      <div className="text-xs text-gray-500">{getMenuNames(mealPlan)}</div>
    </div>
  );

  // 특정 템플릿과 날짜에 맞는 식단 필터링
  const getMealPlansByTemplateAndDate = (templateName: string, date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return mealPlans.filter(
      (plan) => plan.date === dateString && plan.name === templateName
    );
  };

  // getMealTimeName 함수 추가
  const getMealTimeName = (mealTime: 'breakfast' | 'lunch' | 'dinner'): string => {
    switch (mealTime) {
      case 'breakfast':
        return '아침';
      case 'lunch':
        return '점심';
      case 'dinner':
        return '저녁';
      default:
        return mealTime;
    }
  };

  // PC 버전 렌더링
  const renderDesktopView = () => (
    <div className="hidden md:grid grid-cols-8 border-t border-l border-gray-200">
      {/* 첫 번째 열: 템플릿 이름 */}
      <div className="col-span-1 border-r border-gray-200">
        <div className="h-16 border-b border-gray-200"></div> {/* 날짜 헤더 높이 맞춤 */} 
        {templateGroups.map((templateName, index) => (
          <div key={`template-${index}`} className="h-48 flex items-center justify-center font-semibold text-sm text-gray-500 border-b border-gray-200">
            {templateName}
          </div>
        ))}
      </div>
      
      {/* 나머지 열: 요일별 식단 */} 
      {daysOfWeek.map((day, index) => (
        <div key={index} className="col-span-1 border-r border-gray-200">
          <div className="h-16 text-center py-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm">{format(day, 'E', { locale: ko })}</div>
            <div className="text-lg font-bold mt-1">{format(day, 'd')}</div>
          </div>
          
          {/* 템플릿별 식단 표시 */}
          {templateGroups.map((templateName, templateIndex) => {
            const templateMealPlans = getMealPlansByTemplateAndDate(templateName, day);
            return (
              <div key={`day-${index}-template-${templateIndex}`} className="h-48 border-b border-gray-200 p-2 relative group">
                <div className="h-[90%] overflow-y-auto pr-1 space-y-2 mb-2">
                  {templateMealPlans.map(renderMealPlanCard)}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute bottom-2 right-2 w-auto opacity-40 hover:opacity-100 transition-opacity text-xs bg-white/80 rounded-full h-7 px-2"
                  onClick={() => {
                    // 현재 시간에 따라 기본 식사 시간 설정
                    const now = new Date();
                    const hour = now.getHours();
                    let mealTime: 'breakfast' | 'lunch' | 'dinner';
                    
                    if (hour < 10) {
                      mealTime = 'breakfast';
                    } else if (hour < 15) {
                      mealTime = 'lunch';
                    } else {
                      mealTime = 'dinner';
                    }
                    
                    onAddMealPlan(day, mealTime);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> 추가
                </Button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // 모바일 버전 렌더링
  const renderMobileView = () => (
    <div className="md:hidden space-y-3">
      {daysOfWeek.map((day, index) => {
        // 이 날짜에 있는 모든 식단 가져오기 (템플릿별로 그룹화)
        const dayMealPlans = getMealPlansByDate(mealPlans, day);
        const hasMealPlans = dayMealPlans.length > 0;
        
        // 템플릿별로 식단 그룹화
        const templateMealPlans: Record<string, MealPlan[]> = {};
        dayMealPlans.forEach(plan => {
          if (!templateMealPlans[plan.name]) {
            templateMealPlans[plan.name] = [];
          }
          templateMealPlans[plan.name].push(plan);
        });
        
        // 오늘 날짜인지 확인
        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        
        return (
          <div 
            key={`mobile-day-${index}`} 
            className={`border rounded-md overflow-hidden ${isToday ? 'border-blue-300 bg-blue-50' : ''}`}
          >
            <div className="px-4 py-3 flex justify-between items-center">
              <div className="flex items-center">
                <div className={`rounded-full w-10 h-10 flex items-center justify-center mr-3 ${
                  isToday ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}>
                  {format(day, 'd')}
                </div>
                <div>
                  <div className="font-medium">{format(day, 'E', { locale: ko })}</div>
                  <div className="text-xs text-gray-500">{format(day, 'yyyy년 MM월 dd일')}</div>
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8"
                  onClick={() => onAddMealPlan(day, 'lunch')} // 기본값으로 점심 선택
                >
                  <Plus className="h-3 w-3 mr-1" /> 식단 추가
                </Button>
              </div>
            </div>
            
            {hasMealPlans ? (
              <div className="px-4 py-2 space-y-2 border-t bg-gray-50">
                {/* 템플릿별 식단 표시 */}
                {Object.entries(templateMealPlans).map(([templateName, plans]) => (
                  <div key={`template-${templateName}`} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">{templateName}</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {plans.length}개
                      </Badge>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto pb-1 hide-scrollbar">
                      <div className="flex gap-1 min-w-fit">
                        {plans.map(plan => (
                          <Button
                            key={plan.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 whitespace-nowrap"
                            onClick={() => onViewMealPlan(plan)}
                          >
                            {getMealTimeName(plan.meal_time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 border-t text-xs text-gray-400 italic">
                등록된 식단이 없습니다.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // 아무 템플릿도 없을 경우 안내 메시지
  if (templateGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-gray-400 mb-4">등록된 식단 템플릿이 없습니다.</div>
        <div className="text-sm text-gray-500">식단 추가 시 생성된 템플릿(식단 이름)이 여기에 표시됩니다.</div>
      </div>
    );
  }

  return (
    <>
      {renderDesktopView()}
      {renderMobileView()}
    </>
  );
};

export default WeekView; 