'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CalendarIcon } from 'lucide-react';
import { isSameDay, parseISO } from 'date-fns';
import { MealPlan } from './types';

interface MealPlanDetailsProps {
  selectedDate: Date | undefined;
  showBreakfast: boolean;
  showDinner: boolean;
  mealPlans: MealPlan[];
  isMobile: boolean;
  onEditMealPlan: (mealPlan: MealPlan) => void;
  onDeleteMealPlan: (mealPlanId: string) => void;
}

export function MealPlanDetails({
  selectedDate,
  showBreakfast,
  showDinner,
  mealPlans,
  isMobile,
  onEditMealPlan,
  onDeleteMealPlan
}: MealPlanDetailsProps) {
  // 특정 날짜의 메뉴 가져오기
  const getMealPlansForDate = (date: Date) => {
    return mealPlans.filter(plan => 
      isSameDay(parseISO(plan.date), date)
    );
  };

  return (
    <Card className={isMobile ? 'w-full' : 'w-1/2'}>
      {selectedDate ? (
        <>
          <CardHeader>
            <CardTitle>{format(selectedDate, 'yyyy년 MM월 dd일 (eee)', { locale: ko })} 식단</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 아침 */}
            {showBreakfast && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">아침</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  {getMealPlansForDate(selectedDate)
                    .filter(plan => plan.meal_time === 'breakfast')
                    .map(plan => (
                      <div key={plan.id} className="flex justify-between items-center mb-2">
                        <span className="truncate max-w-[120px] md:max-w-[200px]">{plan.menu_name}</span>
                        <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEditMealPlan(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => plan.id && onDeleteMealPlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {getMealPlansForDate(selectedDate).filter(plan => plan.meal_time === 'breakfast').length === 0 && (
                    <div className="text-gray-500 text-center">등록된 식단이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
            
            {/* 점심 */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">점심</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {getMealPlansForDate(selectedDate)
                  .filter(plan => plan.meal_time === 'lunch')
                  .map(plan => (
                    <div key={plan.id} className="flex justify-between items-center mb-2">
                      <span className="truncate max-w-[120px] md:max-w-[200px]">{plan.menu_name}</span>
                      <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditMealPlan(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => plan.id && onDeleteMealPlan(plan.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                {getMealPlansForDate(selectedDate).filter(plan => plan.meal_time === 'lunch').length === 0 && (
                  <div className="text-gray-500 text-center">등록된 식단이 없습니다.</div>
                )}
              </div>
            </div>
            
            {/* 저녁 */}
            {showDinner && (
              <div>
                <h3 className="font-medium mb-2">저녁</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  {getMealPlansForDate(selectedDate)
                    .filter(plan => plan.meal_time === 'dinner')
                    .map(plan => (
                      <div key={plan.id} className="flex justify-between items-center mb-2">
                        <span className="truncate max-w-[120px] md:max-w-[200px]">{plan.menu_name}</span>
                        <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEditMealPlan(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => plan.id && onDeleteMealPlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {getMealPlansForDate(selectedDate).filter(plan => plan.meal_time === 'dinner').length === 0 && (
                    <div className="text-gray-500 text-center">등록된 식단이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </>
      ) : (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">날짜를 선택해주세요</h3>
            <p>캘린더에서 날짜를 선택하면 해당 일자의 식단 정보를 확인할 수 있습니다.</p>
          </div>
        </div>
      )}
    </Card>
  );
} 