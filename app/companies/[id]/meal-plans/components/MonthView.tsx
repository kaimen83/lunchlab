import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
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
  return (
    <div className="border-t border-gray-200">
      <div className="grid grid-cols-7 border-l border-gray-200">
        {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
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
                  
                  <div className="space-y-1 text-xs">
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
                      className="absolute bottom-1 right-1 w-6 h-6 p-0 opacity-40 hover:opacity-100 transition-opacity"
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
};

export default MonthView; 