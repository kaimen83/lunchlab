'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { MealPlan } from './types';
import { isSameDay, parseISO } from 'date-fns';

interface MealPlansCalendarProps {
  date: Date;
  setDate: (date: Date) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  mealPlans: MealPlan[];
  isMobile: boolean;
}

export function MealPlansCalendar({ 
  date, 
  setDate, 
  selectedDate, 
  setSelectedDate, 
  mealPlans,
  isMobile
}: MealPlansCalendarProps) {
  // 특정 날짜의 메뉴 가져오기
  const getMealPlansForDate = (date: Date) => {
    return mealPlans.filter(plan => 
      isSameDay(parseISO(plan.date), date)
    );
  };

  return (
    <Card className={isMobile ? 'w-full' : 'w-1/2'}>
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-between">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              const prevMonth = new Date(date);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setDate(prevMonth);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </Button>
          {format(date, 'yyyy년 MM월', { locale: ko })}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              const nextMonth = new Date(date);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setDate(nextMonth);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={date}
          onMonthChange={setDate}
          locale={ko}
          className="w-full"
          classNames={{
            day_selected: "bg-blue-500 text-white",
            table: "w-full",
            cell: "p-0",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          }}
          components={{
            DayContent: (props) => {
              const dayMealPlans = getMealPlansForDate(props.date);
              const hasMealPlan = dayMealPlans.length > 0;
              
              return (
                <div className="relative">
                  <div>{props.date.getDate()}</div>
                  {hasMealPlan && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                      <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                    </div>
                  )}
                </div>
              );
            },
            Caption: () => null // 캘린더 상단의 기본 캡션(연/월 표시)을 숨김
          }}
        />
      </CardContent>
    </Card>
  );
} 