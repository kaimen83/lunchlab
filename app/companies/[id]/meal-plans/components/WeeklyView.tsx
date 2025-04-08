'use client';

import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MealPlan } from './types';

interface WeeklyViewProps {
  date: Date;
  setDate: (date: Date) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  mealPlans: MealPlan[];
  showBreakfast: boolean;
  showDinner: boolean;
  isMobile: boolean;
}

export function WeeklyView({
  date,
  setDate,
  selectedDate,
  setSelectedDate,
  mealPlans,
  showBreakfast,
  showDinner,
  isMobile
}: WeeklyViewProps) {
  // 주간 일자 범위 계산
  const getWeekDateRange = (date: Date) => {
    const start = startOfWeek(date, { locale: ko });
    const end = endOfWeek(date, { locale: ko });
    
    return eachDayOfInterval({ start, end });
  };

  // 특정 날짜의 메뉴 가져오기
  const getMealPlansForDate = (date: Date) => {
    return mealPlans.filter(plan => 
      isSameDay(parseISO(plan.date), date)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-between">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              const prevWeek = new Date(date);
              prevWeek.setDate(prevWeek.getDate() - 7);
              setDate(prevWeek);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </Button>
          <span className={`${isMobile ? 'text-sm' : 'text-base'}`}>
            {format(getWeekDateRange(date)[0], isMobile ? 'MM/dd' : 'yyyy년 MM월 dd일', { locale: ko })} - 
            {format(getWeekDateRange(date)[6], isMobile ? 'MM/dd' : 'yyyy년 MM월 dd일', { locale: ko })}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              const nextWeek = new Date(date);
              nextWeek.setDate(nextWeek.getDate() + 7);
              setDate(nextWeek);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-7 gap-2'}`}>
          {isMobile ? (
            // 모바일에서는 아코디언 스타일의 일자별 식단 표시
            getWeekDateRange(date).map((day, index) => (
              <div 
                key={index} 
                className="border rounded-md overflow-hidden"
              >
                <div 
                  className="bg-gray-100 p-3 font-medium flex justify-between items-center cursor-pointer"
                  onClick={() => setSelectedDate(day)}
                >
                  <div>
                    {format(day, 'MM월 dd일 (eee)', { locale: ko })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getMealPlansForDate(day).length > 0 ? `${getMealPlansForDate(day).length}개 메뉴` : '식단 없음'}
                  </div>
                </div>
                
                {isSameDay(day, selectedDate || new Date()) && (
                  <div className="p-3">
                    {/* 아침 */}
                    {showBreakfast && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1">아침</h4>
                        {getMealPlansForDate(day)
                          .filter(plan => plan.meal_time === 'breakfast')
                          .map(plan => (
                            <div key={plan.id} className="text-sm mb-1 flex justify-between">
                              <span>{plan.menu_name}</span>
                              <span className="text-gray-500">{plan.quantity}인분</span>
                            </div>
                          ))}
                        {getMealPlansForDate(day).filter(plan => plan.meal_time === 'breakfast').length === 0 && (
                          <div className="text-xs text-gray-500">등록된 식단이 없습니다.</div>
                        )}
                      </div>
                    )}
                    
                    {/* 점심 */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium mb-1">점심</h4>
                      {getMealPlansForDate(day)
                        .filter(plan => plan.meal_time === 'lunch')
                        .map(plan => (
                          <div key={plan.id} className="text-sm mb-1 flex justify-between">
                            <span>{plan.menu_name}</span>
                            <span className="text-gray-500">{plan.quantity}인분</span>
                          </div>
                        ))}
                      {getMealPlansForDate(day).filter(plan => plan.meal_time === 'lunch').length === 0 && (
                        <div className="text-xs text-gray-500">등록된 식단이 없습니다.</div>
                      )}
                    </div>
                    
                    {/* 저녁 */}
                    {showDinner && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">저녁</h4>
                        {getMealPlansForDate(day)
                          .filter(plan => plan.meal_time === 'dinner')
                          .map(plan => (
                            <div key={plan.id} className="text-sm mb-1 flex justify-between">
                              <span>{plan.menu_name}</span>
                              <span className="text-gray-500">{plan.quantity}인분</span>
                            </div>
                          ))}
                        {getMealPlansForDate(day).filter(plan => plan.meal_time === 'dinner').length === 0 && (
                          <div className="text-xs text-gray-500">등록된 식단이 없습니다.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            // 데스크톱에서는 기존 레이아웃 유지
            getWeekDateRange(date).map((day, index) => (
              <div 
                key={index} 
                className="border rounded-md p-2 min-h-32"
                onClick={() => setSelectedDate(day)}
              >
                <div className="font-medium text-center mb-2">
                  {format(day, 'eee', { locale: ko })}
                  <div>{format(day, 'd', { locale: ko })}</div>
                </div>
                
                {/* 아침 */}
                {showBreakfast && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500">아침</div>
                    {getMealPlansForDate(day)
                      .filter(plan => plan.meal_time === 'breakfast')
                      .map(plan => (
                        <div key={plan.id} className="text-xs truncate">
                          {plan.menu_name}
                        </div>
                      ))}
                  </div>
                )}
                
                {/* 점심 */}
                <div className="mb-2">
                  <div className="text-xs text-gray-500">점심</div>
                  {getMealPlansForDate(day)
                    .filter(plan => plan.meal_time === 'lunch')
                    .map(plan => (
                      <div key={plan.id} className="text-xs truncate">
                        {plan.menu_name}
                      </div>
                    ))}
                </div>
                
                {/* 저녁 */}
                {showDinner && (
                  <div>
                    <div className="text-xs text-gray-500">저녁</div>
                    {getMealPlansForDate(day)
                      .filter(plan => plan.meal_time === 'dinner')
                      .map(plan => (
                        <div key={plan.id} className="text-xs truncate">
                          {plan.menu_name}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 