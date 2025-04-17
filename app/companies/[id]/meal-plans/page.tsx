'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import CalendarHeader from './components/CalendarHeader';
import { MealPlan, ViewType, FormMode } from './types';
import { getMealTimeName } from './utils';
import MealPlanListModal from './components/MealPlanListModal';
import { exportWeeklyMealPlans, exportMonthlyMealPlans } from './utils/exportExcel';

// 문제가 있는 컴포넌트는 타입 정의 문제를 회피하기 위해 type assertion 사용
const MealPlanForm = require('./components/MealPlanForm').default as React.FC<{
  companyId: string;
  initialData: MealPlan | null;
  defaultMealTime?: 'breakfast' | 'lunch' | 'dinner';
  onSave: (data: any) => void;
  onCancel: () => void;
}>;

const MealPlanDetails = require('./components/MealPlanDetails').default as React.FC<{
  mealPlan: MealPlan;
  onEdit: () => void;
  onDelete: () => void;
}>;

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
  const [companyName, setCompanyName] = useState<string>('');

  // 회사 정보 가져오기
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompanyName(data.name || '회사');
        }
      } catch (error) {
        console.error('회사 정보 가져오기 오류:', error);
      }
    };
    
    if (companyId) {
      fetchCompanyInfo();
    }
  }, [companyId]);

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

  // 엑셀로 내보내기
  const handleExportToExcel = () => {
    if (viewType === 'week') {
      // 주간 식단표 내보내기
      exportWeeklyMealPlans(daysOfWeek, mealPlans, companyName);
    } else {
      // 월간 식단표 내보내기
      exportMonthlyMealPlans(getMonthWeeks(), mealPlans, companyName, currentWeek.getMonth());
    }
    
    toast({
      title: '내보내기 완료',
      description: '엑셀 파일이 다운로드 되었습니다.'
    });
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
    
    // 달력 표시에 필요한 이전 달의 날짜들을 포함 (첫째 주 채우기 위함)
    // 첫날의 요일을 기준으로 필요한 이전 달의 날짜들을 계산
    const firstDayOfWeek = firstDay.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    let startDate = new Date(firstDay);
    
    // 일요일(0)부터 시작하는 달력을 위해 날짜 조정
    if (firstDayOfWeek > 0) {
      startDate.setDate(firstDay.getDate() - firstDayOfWeek);
    }
    
    // 마지막 주를 채우기 위한 다음 달의 날짜 계산
    const lastDayOfWeek = lastDay.getDay();
    let endDate = new Date(lastDay);
    
    // 토요일(6)로 끝나지 않는 경우 다음 달 날짜 추가
    if (lastDayOfWeek < 6) {
      endDate.setDate(lastDay.getDate() + (6 - lastDayOfWeek));
    }
    
    // 시작일부터 종료일까지의 모든 날짜 배열 생성
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // 주 단위로 분할
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    days.forEach((day, index) => {
      week.push(day);
      
      // 토요일(6)마다 또는 마지막 날짜에 새로운 주 추가
      if (day.getDay() === 6 || index === days.length - 1) {
        weeks.push([...week]);
        week = [];
      }
    });
    
    return weeks;
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* 페이지 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">식단 계획</h1>
            </div>
            <div className="hidden md:flex items-center">
              <button
                type="button"
                onClick={handleAddMealPlan}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                식단 추가
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* 페이지 콘텐츠 */}
      <main className="flex-1 overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CalendarHeader 
            viewType={viewType}
            currentWeek={currentWeek}
            onViewTypeChange={handleViewTypeChange}
            onPreviousPeriod={handlePreviousPeriod}
            onNextPeriod={handleNextPeriod}
            onToday={handleGoToToday}
            onExportToExcel={handleExportToExcel}
          />
          
          <Card className="shadow mt-4">
            <CardHeader className="border-b px-4 md:px-6 py-3 md:py-4">
              <CardTitle className="text-base md:text-lg font-medium">
                {viewType === 'week'
                  ? `${format(weekStart, 'yyyy년 MM월 dd일')} - ${format(weekEnd, 'MM월 dd일')}`
                  : format(currentWeek, 'yyyy년 MM월')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2 lg:p-4">
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
        </div>
      </main>

      {/* 모바일 화면용 떠 있는 추가 버튼 */}
      <div className="md:hidden fixed bottom-6 right-6 z-10">
        <button
          type="button"
          onClick={handleAddMealPlan}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* 식단 폼 모달 */}
      <Dialog open={showMealPlanForm} onOpenChange={setShowMealPlanForm}>
        <DialogContent className="max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-md md:max-w-lg">
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