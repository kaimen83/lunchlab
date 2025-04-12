'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import MealPlanForm from './components/MealPlanForm';
import MealPlanDetails from './components/MealPlanDetails';
import MealPlanListModal from './components/MealPlanListModal';
import CalendarHeader from './components/CalendarHeader';
import { MealPlan, ViewType, FormMode } from './types';
import { getMealTimeName } from './utils';

export default function MealPlansPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showMealPlanForm, setShowMealPlanForm] = useState<boolean>(false);
  const [showMealPlanDetails, setShowMealPlanDetails] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [selectedMealTime, setSelectedMealTime] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [selectedPlansForSlot, setSelectedPlansForSlot] = useState<MealPlan[] | null>(null);
  const [showMealPlanListModal, setShowMealPlanListModal] = useState<boolean>(false);

  // 페이지 로드 시 식단 목록 가져오기
  useEffect(() => {
    loadMealPlans();
  }, [companyId, currentWeek, viewType]);

  // 식단 목록 가져오기
  const loadMealPlans = async () => {
    setIsLoading(true);
    try {
      let startDate, endDate;
      
      if (viewType === 'week') {
        startDate = format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      } else {
        // 월간 뷰의 경우 현재 월 전체 범위
        const year = currentWeek.getFullYear();
        const month = currentWeek.getMonth();
        startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
        endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
      }
      
      const response = await fetch(`/api/companies/${companyId}/meal-plans?startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('식단 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMealPlans(data);
    } catch (error) {
      console.error('식단 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 식단 추가 버튼 클릭 핸들러
  const handleAddMealPlan = () => {
    // 현재 시간에 따라 식사 시간 선택
    const now = new Date();
    const hour = now.getHours();
    
    let mealTime: 'breakfast' | 'lunch' | 'dinner';
    
    // 시간대별 식사 시간 설정
    if (hour < 10) {
      mealTime = 'breakfast'; // 10시 이전은 아침
    } else if (hour < 15) {
      mealTime = 'lunch'; // 10시 ~ 15시는 점심
    } else {
      mealTime = 'dinner'; // 15시 이후는 저녁
    }
    
    setSelectedMealTime(mealTime);
    setFormMode('create');
    setSelectedMealPlan(null);
    setShowMealPlanForm(true);
  };

  // 식단 폼 열기 (날짜와 식사 시간 지정)
  const handleAddMealPlanForDateAndTime = (date: Date, mealTime: 'breakfast' | 'lunch' | 'dinner') => {
    setSelectedDate(date);
    setFormMode('create');
    setSelectedMealTime(mealTime);
    setSelectedMealPlan({
      id: '',
      company_id: companyId as string,
      name: '',
      date: format(date, 'yyyy-MM-dd'),
      meal_time: mealTime,
      created_at: '',
      updated_at: '',
      meal_plan_menus: []
    });
    setShowMealPlanForm(true);
  };

  // 월간 뷰에서 식단 추가 (시간 자동 선택)
  const handleAddMealPlanFromMonthView = (date: Date) => {
    // 현재 시간에 따라 식사 시간 선택
    const now = new Date();
    const hour = now.getHours();
    
    let mealTime: 'breakfast' | 'lunch' | 'dinner';
    
    // 시간대별 식사 시간 설정
    if (hour < 10) {
      mealTime = 'breakfast'; // 10시 이전은 아침
    } else if (hour < 15) {
      mealTime = 'lunch'; // 10시 ~ 15시는 점심
    } else {
      mealTime = 'dinner'; // 15시 이후는 저녁
    }
    
    setSelectedMealTime(mealTime);
    setSelectedDate(date);
    setFormMode('create');
    setShowMealPlanForm(true);
  };

  // 식단 편집
  const handleEditMealPlan = (mealPlan: MealPlan) => {
    setFormMode('edit');
    setSelectedMealPlan(mealPlan);
    setShowMealPlanForm(true);
  };

  // 식단 상세 보기
  const handleViewMealPlan = (mealPlan: MealPlan) => {
    setSelectedMealPlan(mealPlan);
    setShowMealPlanDetails(true);
  };

  // 식단 저장 처리
  const handleSaveMealPlan = async (mealPlanData: any) => {
    try {
      if (formMode === 'create') {
        const response = await fetch(`/api/companies/${companyId}/meal-plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mealPlanData),
        });
        
        if (!response.ok) {
          throw new Error('식단을 추가하는데 실패했습니다.');
        }
        
        toast({
          title: '성공',
          description: '새 식단이 추가되었습니다.',
        });
      } else {
        if (!selectedMealPlan) return;
        
        const response = await fetch(`/api/companies/${companyId}/meal-plans/${selectedMealPlan.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mealPlanData),
        });
        
        if (!response.ok) {
          throw new Error('식단을 수정하는데 실패했습니다.');
        }
        
        toast({
          title: '성공',
          description: '식단이 수정되었습니다.',
        });
      }
      
      setShowMealPlanForm(false);
      loadMealPlans();
    } catch (error) {
      console.error('식단 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단을 저장하는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 식단 삭제 처리
  const handleDeleteMealPlan = async (mealPlanId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-plans/${mealPlanId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('식단을 삭제하는데 실패했습니다.');
      }
      
      toast({
        title: '성공',
        description: '식단이 삭제되었습니다.',
      });
      
      setShowMealPlanDetails(false);
      loadMealPlans();
    } catch (error) {
      console.error('식단 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단을 삭제하는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 주간 이동
  const handlePreviousPeriod = () => {
    if (viewType === 'week') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      // 월간 뷰의 경우 한 달 이전으로
      const prevMonth = new Date(currentWeek);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentWeek(prevMonth);
    }
  };

  const handleNextPeriod = () => {
    if (viewType === 'week') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      // 월간 뷰의 경우 한 달 다음으로
      const nextMonth = new Date(currentWeek);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentWeek(nextMonth);
    }
  };

  // 오늘로 이동
  const handleGoToToday = () => {
    setCurrentWeek(new Date());
  };

  // 뷰 타입 변경
  const handleViewTypeChange = (type: ViewType) => {
    setViewType(type);
  };

  // 특정 시간대 식단 목록 보기
  const handleViewMealTimeSlot = (date: Date, mealTime: 'breakfast' | 'lunch' | 'dinner', plans: MealPlan[]) => {
    setSelectedDate(date);
    setSelectedMealTime(mealTime);
    setSelectedPlansForSlot(plans);
    setShowMealPlanListModal(true);
  };

  // 현재 주의 시작일과 종료일
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 월간 뷰용 주 계산
  const getMonthWeeks = () => {
    // 현재 월의 첫 날짜와 마지막 날짜
    const year = currentWeek.getFullYear();
    const month = currentWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 주의 시작일 (월요일부터 시작)
    let weekStart = startOfWeek(firstDay, { weekStartsOn: 1 });
    
    // 월 뷰의 표시 날짜가 전월이면 현재 월의 1일로 조정
    if (weekStart.getMonth() !== month) {
      weekStart = firstDay;
    }
    
    // 날짜 범위 계산 (마지막 날짜를 포함한 전체 주)
    const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: endDate });
    
    // 주 단위로 분할
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    days.forEach((day, index) => {
      week.push(day);
      
      if ((index + 1) % 7 === 0 || index === days.length - 1) {
        weeks.push([...week]);
        week = [];
      }
    });
    
    return weeks;
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <CalendarHeader 
        viewType={viewType}
        currentWeek={currentWeek}
        onViewTypeChange={handleViewTypeChange}
        onPreviousPeriod={handlePreviousPeriod}
        onNextPeriod={handleNextPeriod}
        onToday={handleGoToToday}
      />
      
      <Card className="shadow-sm">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-lg font-medium">
            {viewType === 'week'
              ? `${format(weekStart, 'yyyy년 MM월 dd일')} - ${format(weekEnd, 'MM월 dd일')}`
              : format(currentWeek, 'yyyy년 MM월')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : viewType === 'week' ? (
            <WeekView 
              daysOfWeek={daysOfWeek}
              mealPlans={mealPlans}
              companyId={companyId as string}
              onViewMealPlan={handleViewMealPlan}
              onAddMealPlan={handleAddMealPlanForDateAndTime}
            />
          ) : (
            <MonthView 
              weeks={getMonthWeeks()}
              mealPlans={mealPlans}
              currentMonth={currentWeek.getMonth()}
              onViewMealTimeSlot={handleViewMealTimeSlot}
              onAddMealPlan={handleAddMealPlanFromMonthView}
            />
          )}
        </CardContent>
      </Card>

      {/* 식단 폼 모달 */}
      <Dialog open={showMealPlanForm} onOpenChange={setShowMealPlanForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? '새 식단 추가' : '식단 수정'}</DialogTitle>
            <DialogDescription>
              {selectedMealPlan && selectedMealPlan.date
                ? `${format(new Date(selectedMealPlan.date), 'yyyy년 MM월 dd일')} ${getMealTimeName(selectedMealPlan.meal_time)}`
                : '날짜와 시간을 선택하세요.'}
            </DialogDescription>
          </DialogHeader>
          <MealPlanForm
            companyId={companyId as string}
            initialData={selectedMealPlan}
            defaultMealTime={formMode === 'create' ? selectedMealTime : undefined}
            onSave={handleSaveMealPlan}
            onCancel={() => setShowMealPlanForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 식단 상세 보기 모달 */}
      <Dialog open={showMealPlanDetails} onOpenChange={setShowMealPlanDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>식단 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedMealPlan
                ? `${format(new Date(selectedMealPlan.date), 'yyyy년 MM월 dd일')} ${getMealTimeName(selectedMealPlan.meal_time)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedMealPlan && (
            <MealPlanDetails
              mealPlan={selectedMealPlan}
              onEdit={() => {
                setShowMealPlanDetails(false);
                handleEditMealPlan(selectedMealPlan);
              }}
              onDelete={() => handleDeleteMealPlan(selectedMealPlan.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 식단 목록 모달 */}
      <MealPlanListModal
        open={showMealPlanListModal}
        onOpenChange={setShowMealPlanListModal}
        selectedDate={selectedDate}
        selectedMealTime={selectedMealTime}
        mealPlans={selectedPlansForSlot}
        onView={(plan) => {
          setShowMealPlanListModal(false);
          handleViewMealPlan(plan);
        }}
        onEdit={(plan) => {
          setShowMealPlanListModal(false);
          handleEditMealPlan(plan);
        }}
        onDelete={(planId) => {
          setShowMealPlanListModal(false);
          handleDeleteMealPlan(planId);
        }}
      />
    </div>
  );
} 