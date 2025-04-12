'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import MealPlanForm from './components/MealPlanForm';
import MealPlanDetails from './components/MealPlanDetails';

interface MealPlanMenu {
  id: string;
  meal_plan_id: string;
  menu_id: string;
  menu: {
    id: string;
    name: string;
    description: string | null;
    cost_price: number;
  };
}

interface MealPlan {
  id: string;
  company_id: string;
  name: string;
  date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  created_at: string;
  updated_at: string;
  meal_plan_menus: MealPlanMenu[];
}

export default function MealPlansPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('week');
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showMealPlanForm, setShowMealPlanForm] = useState<boolean>(false);
  const [showMealPlanDetails, setShowMealPlanDetails] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedMealTime, setSelectedMealTime] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');

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

  // 식단 추가
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
  const handlePreviousWeek = () => {
    if (viewType === 'week') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      // 월간 뷰의 경우 한 달 이전으로
      const prevMonth = new Date(currentWeek);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentWeek(prevMonth);
    }
  };

  const handleNextWeek = () => {
    if (viewType === 'week') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      // 월간 뷰의 경우 한 달 다음으로
      const nextMonth = new Date(currentWeek);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentWeek(nextMonth);
    }
  };

  // 현재 주의 시작일과 종료일
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 날짜별 식단 필터링
  const getMealPlansByDate = (date: Date, mealTime?: 'breakfast' | 'lunch' | 'dinner') => {
    const dateString = format(date, 'yyyy-MM-dd');
    return mealPlans.filter(
      (plan) => plan.date === dateString && (!mealTime || plan.meal_time === mealTime)
    );
  };

  // 식사 시간대 한글 이름
  const getMealTimeName = (mealTime: 'breakfast' | 'lunch' | 'dinner') => {
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

  // 식단에 포함된 메뉴 이름 렌더링
  const renderMenuNames = (mealPlan: MealPlan) => {
    if (!mealPlan.meal_plan_menus || mealPlan.meal_plan_menus.length === 0) {
      return '메뉴 없음';
    }
    
    const menuNames = mealPlan.meal_plan_menus.map(item => item.menu.name);
    if (menuNames.length <= 2) {
      return menuNames.join(', ');
    }
    return `${menuNames[0]}, ${menuNames[1]} 외 ${menuNames.length - 2}개`;
  };

  // 식단 카드 렌더링
  const renderMealPlanCard = (mealPlan: MealPlan) => (
    <Card 
      key={mealPlan.id} 
      className="mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleViewMealPlan(mealPlan)}
    >
      <CardContent className="p-3">
        <div className="font-medium">{mealPlan.name}</div>
        <div className="text-sm text-gray-500">{renderMenuNames(mealPlan)}</div>
      </CardContent>
    </Card>
  );

  // 주간 뷰 렌더링
  const renderWeekView = () => (
    <div className="grid grid-cols-8 gap-4 mt-4">
      {/* 첫 번째 열: 시간대 */}
      <div className="col-span-1">
        <div className="h-12"></div>
        <div className="h-40 flex items-center justify-center font-medium">아침</div>
        <div className="h-40 flex items-center justify-center font-medium">점심</div>
        <div className="h-40 flex items-center justify-center font-medium">저녁</div>
      </div>
      
      {/* 나머지 열: 요일별 식단 */}
      {daysOfWeek.map((day, index) => (
        <div key={index} className="col-span-1">
          <div className="h-12 text-center py-2 font-medium">
            {format(day, 'E', { locale: ko })}
            <div className="text-sm">{format(day, 'd')}</div>
          </div>
          
          {/* 아침 식단 */}
          <div className="h-40 border p-2 overflow-y-auto">
            {getMealPlansByDate(day, 'breakfast').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1" 
              onClick={() => {
                setSelectedDate(day);
                setFormMode('create');
                setSelectedMealTime('breakfast');
                setSelectedMealPlan({
                  id: '',
                  company_id: companyId as string,
                  name: '',
                  date: format(day, 'yyyy-MM-dd'),
                  meal_time: 'breakfast',
                  created_at: '',
                  updated_at: '',
                  meal_plan_menus: []
                });
                setShowMealPlanForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          </div>
          
          {/* 점심 식단 */}
          <div className="h-40 border p-2 overflow-y-auto">
            {getMealPlansByDate(day, 'lunch').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1" 
              onClick={() => {
                setSelectedDate(day);
                setFormMode('create');
                setSelectedMealTime('lunch');
                setSelectedMealPlan({
                  id: '',
                  company_id: companyId as string,
                  name: '',
                  date: format(day, 'yyyy-MM-dd'),
                  meal_time: 'lunch',
                  created_at: '',
                  updated_at: '',
                  meal_plan_menus: []
                });
                setShowMealPlanForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          </div>
          
          {/* 저녁 식단 */}
          <div className="h-40 border p-2 overflow-y-auto">
            {getMealPlansByDate(day, 'dinner').map(renderMealPlanCard)}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1" 
              onClick={() => {
                setSelectedDate(day);
                setFormMode('create');
                setSelectedMealTime('dinner');
                setSelectedMealPlan({
                  id: '',
                  company_id: companyId as string,
                  name: '',
                  date: format(day, 'yyyy-MM-dd'),
                  meal_time: 'dinner',
                  created_at: '',
                  updated_at: '',
                  meal_plan_menus: []
                });
                setShowMealPlanForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> 추가
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // 월간 뷰 렌더링
  const renderMonthView = () => {
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
    
    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-0">
          {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
            <div key={day} className="text-center py-2 font-medium border">
              {day}
            </div>
          ))}
          
          {weeks.map((week, weekIndex) => (
            <React.Fragment key={`week-${weekIndex}`}>
              {week.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === month;
                
                return (
                  <div
                    key={`day-${weekIndex}-${dayIndex}`}
                    className={`min-h-[100px] border p-1 overflow-hidden relative ${
                      !isCurrentMonth ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="text-right text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      {/* 아침, 점심, 저녁 아이콘 및 식단 수 표시 */}
                      {(['breakfast', 'lunch', 'dinner'] as const).map((mealTime) => {
                        const plans = getMealPlansByDate(day, mealTime);
                        if (plans.length === 0) return null;
                        
                        return (
                          <div 
                            key={mealTime}
                            className="flex items-center cursor-pointer"
                            onClick={() => {
                              setSelectedDate(day);
                              const firstPlan = plans[0];
                              if (firstPlan) {
                                handleViewMealPlan(firstPlan);
                              }
                            }}
                          >
                            <span className="w-4 text-center font-bold">
                              {mealTime === 'breakfast' ? '아' : mealTime === 'lunch' ? '점' : '저'}
                            </span>
                            <span className="ml-1 truncate">
                              {plans.length > 0 && `${plans[0].name} ${plans.length > 1 ? `외 ${plans.length - 1}개` : ''}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* 식단 추가 버튼 */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute bottom-0 right-0 w-6 h-6 p-0 m-1 opacity-50 hover:opacity-100" 
                      onClick={() => {
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
                        setSelectedDate(day);
                        setFormMode('create');
                        setShowMealPlanForm(true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">식단 관리</h1>
        
        <div className="flex items-center gap-4">
          <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'week' | 'month')}>
            <TabsList>
              <TabsTrigger value="week">주간 뷰</TabsTrigger>
              <TabsTrigger value="month">월간 뷰</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>
            {viewType === 'week'
              ? `${format(weekStart, 'yyyy년 MM월 dd일')} - ${format(weekEnd, 'yyyy년 MM월 dd일')}`
              : format(currentWeek, 'yyyy년 MM월')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentWeek(new Date())}>
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            viewType === 'week' ? renderWeekView() : renderMonthView()
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
    </div>
  );
} 