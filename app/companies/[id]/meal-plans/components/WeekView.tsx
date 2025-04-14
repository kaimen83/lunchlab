import React from 'react';
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
    <div className="md:hidden space-y-3">
      {daysOfWeek.map((day, index) => {
        // 각 시간대별 식단 가져오기
        const breakfastPlans = getMealPlansByDate(mealPlans, day, 'breakfast');
        const lunchPlans = getMealPlansByDate(mealPlans, day, 'lunch');
        const dinnerPlans = getMealPlansByDate(mealPlans, day, 'dinner');
        
        // 식단이 있는지 확인
        const hasBreakfast = breakfastPlans.length > 0;
        const hasLunch = lunchPlans.length > 0;
        const hasDinner = dinnerPlans.length > 0;
        const hasAnyMeal = hasBreakfast || hasLunch || hasDinner;
        
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
            
            {hasAnyMeal ? (
              <div className="px-4 py-2 space-y-2 border-t bg-gray-50">
                {/* 아침 */}
                {hasBreakfast && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">아침</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {breakfastPlans.length}개
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      {breakfastPlans.map(plan => (
                        <Button
                          key={plan.id}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => onViewMealPlan(plan)}
                        >
                          {plan.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 점심 */}
                {hasLunch && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">점심</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {lunchPlans.length}개
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      {lunchPlans.map(plan => (
                        <Button
                          key={plan.id}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => onViewMealPlan(plan)}
                        >
                          {plan.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 저녁 */}
                {hasDinner && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">저녁</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {dinnerPlans.length}개
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      {dinnerPlans.map(plan => (
                        <Button
                          key={plan.id}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => onViewMealPlan(plan)}
                        >
                          {plan.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
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

  return (
    <>
      {renderDesktopView()}
      {renderMobileView()}
    </>
  );
};

export default WeekView; 