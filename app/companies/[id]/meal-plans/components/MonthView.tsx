import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { MealPlan } from '../types';
import { getMealPlansByDate } from '../utils';

interface MonthViewProps {
  weeks: Date[][];
  mealPlans: MealPlan[];
  currentMonth: number;
  onViewMealTimeSlot: (date: Date, mealTime: 'breakfast' | 'lunch' | 'dinner', plans: MealPlan[]) => void;
  onAddMealPlan: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  weeks,
  mealPlans,
  currentMonth,
  onViewMealTimeSlot,
  onAddMealPlan
}) => {
  // 모든 날짜를 1차원 배열로 변환
  const allDays = weeks.flat().filter(day => day.getMonth() === currentMonth);
  
  // 날짜별 식단 개수를 가져오는 함수
  const getMealCountByDate = (date: Date): { 
    breakfast: number, 
    lunch: number, 
    dinner: number, 
    total: number 
  } => {
    const breakfastPlans = getMealPlansByDate(mealPlans, date, 'breakfast');
    const lunchPlans = getMealPlansByDate(mealPlans, date, 'lunch');
    const dinnerPlans = getMealPlansByDate(mealPlans, date, 'dinner');
    
    return {
      breakfast: breakfastPlans.length,
      lunch: lunchPlans.length,
      dinner: dinnerPlans.length,
      total: breakfastPlans.length + lunchPlans.length + dinnerPlans.length
    };
  };

  // PC 버전 렌더링
  const renderDesktopView = () => (
    <div className="hidden md:block border-t border-gray-200">
      <div className="grid grid-cols-7 border-l border-gray-200">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="text-center py-3 font-semibold text-sm border-r border-b border-gray-200 bg-gray-50">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-gray-200">
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={`week-${weekIndex}`}>
            {week.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className={`min-h-[120px] border-r border-b border-gray-200 p-2 overflow-hidden relative group ${ 
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : isToday ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-right text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1 text-xs max-h-[70px] overflow-y-auto pr-0.5">
                    {/* 아침, 점심, 저녁 식단 요약 표시 */}
                    {(['breakfast', 'lunch', 'dinner'] as const).map((mealTime) => {
                      const plans = getMealPlansByDate(mealPlans, day, mealTime);
                      if (plans.length === 0) return null;
                      
                      // 이 시간대의 첫 번째 식단 정보 (표시용)
                      const firstPlan = plans[0];
                      
                      return (
                        <div 
                          key={mealTime}
                          className="flex items-center justify-between cursor-pointer text-gray-700 hover:text-blue-600 group"
                          onClick={() => onViewMealTimeSlot(day, mealTime, plans)}
                        >
                          <div className="flex items-center truncate">
                            <span className={`w-3 h-3 rounded-full mr-1.5 flex-shrink-0 ${ 
                              mealTime === 'breakfast' ? 'bg-yellow-400' : mealTime === 'lunch' ? 'bg-green-400' : 'bg-red-400'
                            }`}></span>
                            <span className="truncate text-xs group-hover:underline">
                              {`${firstPlan.name}${plans.length > 1 ? ` 외 ${plans.length - 1}` : ''}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 식단 추가 버튼 */}
                  {isCurrentMonth && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute bottom-1 right-1 w-6 h-6 p-0 opacity-40 hover:opacity-100 transition-opacity bg-white/80"
                      onClick={() => onAddMealPlan(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // 모바일 버전 렌더링
  const renderMobileView = () => (
    <div className="md:hidden space-y-3">
      {allDays.map((day, index) => {
        const isToday = isSameDay(day, new Date());
        const mealCounts = getMealCountByDate(day);
        const hasAnyMeal = mealCounts.total > 0;
        
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
              
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs h-8"
                onClick={() => onAddMealPlan(day)}
              >
                <Plus className="h-3 w-3 mr-1" /> 식단 추가
              </Button>
            </div>
            
            {hasAnyMeal ? (
              <div className="px-4 py-2 space-y-2 border-t bg-gray-50">
                {/* 아침 */}
                {mealCounts.breakfast > 0 && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">아침</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {mealCounts.breakfast}개
                      </Badge>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto pb-1 hide-scrollbar">
                      <div className="flex gap-1 min-w-fit">
                        {getMealPlansByDate(mealPlans, day, 'breakfast').map(plan => (
                          <Button
                            key={plan.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 whitespace-nowrap"
                            onClick={() => onViewMealTimeSlot(day, 'breakfast', [plan])}
                          >
                            {plan.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 점심 */}
                {mealCounts.lunch > 0 && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">점심</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {mealCounts.lunch}개
                      </Badge>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto pb-1 hide-scrollbar">
                      <div className="flex gap-1 min-w-fit">
                        {getMealPlansByDate(mealPlans, day, 'lunch').map(plan => (
                          <Button
                            key={plan.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 whitespace-nowrap"
                            onClick={() => onViewMealTimeSlot(day, 'lunch', [plan])}
                          >
                            {plan.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 저녁 */}
                {mealCounts.dinner > 0 && (
                  <div className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
                    <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                    <div className="text-sm font-medium mr-2">저녁</div>
                    <div className="text-xs mr-auto overflow-hidden">
                      <Badge variant="secondary" className="text-xs">
                        {mealCounts.dinner}개
                      </Badge>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto pb-1 hide-scrollbar">
                      <div className="flex gap-1 min-w-fit">
                        {getMealPlansByDate(mealPlans, day, 'dinner').map(plan => (
                          <Button
                            key={plan.id}
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 whitespace-nowrap"
                            onClick={() => onViewMealTimeSlot(day, 'dinner', [plan])}
                          >
                            {plan.name}
                          </Button>
                        ))}
                      </div>
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

export default MonthView; 