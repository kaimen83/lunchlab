import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
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
  // 식단 카드 렌더링
  const renderMealPlanCard = (mealPlan: MealPlan) => (
    <div 
      key={mealPlan.id} 
      className="p-2 rounded-md cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-150"
      onClick={() => onViewMealPlan(mealPlan)}
    >
      <div className="flex justify-between items-center mb-0.5">
        <div className="font-medium text-xs truncate mr-2">{mealPlan.name}</div>
        <div className="text-xs font-semibold text-blue-600 whitespace-nowrap">
          {formatCurrency(calculateMealPlanCost(mealPlan))}
        </div>
      </div>
      <div className="text-xs text-gray-500 truncate">{getMenuNames(mealPlan)}</div>
    </div>
  );

  // PC 버전 렌더링
  const renderDesktopView = () => (
    <div className="hidden md:grid grid-cols-8 border-t border-l border-gray-200">
      {/* 첫 번째 열: 시간대 */}
      <div className="col-span-1 border-r border-gray-200">
        <div className="h-16 border-b border-gray-200"></div> {/* 날짜 헤더 높이 맞춤 */} 
        <div className="h-48 flex items-center justify-center font-semibold text-sm text-gray-500 border-b border-gray-200">
          아침
        </div>
        <div className="h-48 flex items-center justify-center font-semibold text-sm text-gray-500 border-b border-gray-200">
          점심
        </div>
        <div className="h-48 flex items-center justify-center font-semibold text-sm text-gray-500 border-b border-gray-200">
          저녁
        </div>
      </div>
      
      {/* 나머지 열: 요일별 식단 */} 
      {daysOfWeek.map((day, index) => (
        <div key={index} className="col-span-1 border-r border-gray-200">
          <div className="h-16 text-center py-3 border-b border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm">{format(day, 'E', { locale: ko })}</div>
            <div className="text-lg font-bold mt-1">{format(day, 'd')}</div>
          </div>
          
          {/* 아침 식단 */}
          <div className="h-48 border-b border-gray-200 p-2 space-y-2 overflow-y-auto relative group">
            {getMealPlansByDate(mealPlans, day, 'breakfast').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute bottom-2 right-2 w-full max-w-[calc(100%-1rem)] opacity-40 hover:opacity-100 transition-opacity text-xs"
              onClick={() => onAddMealPlan(day, 'breakfast')}
            >
              <Plus className="h-3 w-3 mr-1" /> 추가
            </Button>
          </div>
          
          {/* 점심 식단 */} 
          <div className="h-48 border-b border-gray-200 p-2 space-y-2 overflow-y-auto relative group">
            {getMealPlansByDate(mealPlans, day, 'lunch').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute bottom-2 right-2 w-full max-w-[calc(100%-1rem)] opacity-40 hover:opacity-100 transition-opacity text-xs"
              onClick={() => onAddMealPlan(day, 'lunch')}
            >
              <Plus className="h-3 w-3 mr-1" /> 추가
            </Button>
          </div>
          
          {/* 저녁 식단 */} 
          <div className="h-48 border-b border-gray-200 p-2 space-y-2 overflow-y-auto relative group">
            {getMealPlansByDate(mealPlans, day, 'dinner').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute bottom-2 right-2 w-full max-w-[calc(100%-1rem)] opacity-40 hover:opacity-100 transition-opacity text-xs"
              onClick={() => onAddMealPlan(day, 'dinner')}
            >
              <Plus className="h-3 w-3 mr-1" /> 추가
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // 모바일 버전 렌더링
  const renderMobileView = () => (
    <div className="md:hidden space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {daysOfWeek.map((day, index) => (
          <AccordionItem key={index} value={`day-${index}`}>
            <AccordionTrigger className="py-3 px-4 bg-gray-50 rounded-t-md">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-700">{format(day, 'd')}</span>
                </div>
                <div className="text-left">
                  <div className="font-semibold">{format(day, 'E', { locale: ko })}</div>
                  <div className="text-xs text-gray-500">{format(day, 'yyyy년 MM월 dd일')}</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-2 py-1 space-y-3">
                {/* 아침 식단 */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-2 border-b flex justify-between items-center">
                    <div className="font-medium text-sm flex items-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                      아침
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => onAddMealPlan(day, 'breakfast')}
                    >
                      <Plus className="h-3 w-3 mr-1" /> 추가
                    </Button>
                  </div>
                  <div className="p-2 space-y-1 min-h-[50px]">
                    {getMealPlansByDate(mealPlans, day, 'breakfast').length > 0 ? 
                      getMealPlansByDate(mealPlans, day, 'breakfast').map(renderMealPlanCard) : 
                      <div className="p-2 text-xs text-gray-400 italic">등록된 식단이 없습니다.</div>
                    }
                  </div>
                </div>
                
                {/* 점심 식단 */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b flex justify-between items-center">
                    <div className="font-medium text-sm flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                      점심
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => onAddMealPlan(day, 'lunch')}
                    >
                      <Plus className="h-3 w-3 mr-1" /> 추가
                    </Button>
                  </div>
                  <div className="p-2 space-y-1 min-h-[50px]">
                    {getMealPlansByDate(mealPlans, day, 'lunch').length > 0 ? 
                      getMealPlansByDate(mealPlans, day, 'lunch').map(renderMealPlanCard) : 
                      <div className="p-2 text-xs text-gray-400 italic">등록된 식단이 없습니다.</div>
                    }
                  </div>
                </div>
                
                {/* 저녁 식단 */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b flex justify-between items-center">
                    <div className="font-medium text-sm flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                      저녁
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => onAddMealPlan(day, 'dinner')}
                    >
                      <Plus className="h-3 w-3 mr-1" /> 추가
                    </Button>
                  </div>
                  <div className="p-2 space-y-1 min-h-[50px]">
                    {getMealPlansByDate(mealPlans, day, 'dinner').length > 0 ? 
                      getMealPlansByDate(mealPlans, day, 'dinner').map(renderMealPlanCard) : 
                      <div className="p-2 text-xs text-gray-400 italic">등록된 식단이 없습니다.</div>
                    }
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  return (
    <>
      {renderDesktopView()}
      {renderMobileView()}
    </>
  );
};

export default WeekView; 