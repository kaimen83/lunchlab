'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Plus, Edit, Trash2 } from 'lucide-react';
import MealPlanForm from './MealPlanForm';

// 식단 계획 타입 정의
interface MealPlan {
  id?: string;
  date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  menu_id: string;
  menu_name?: string;
  quantity: number;
  note?: string;
}

// 메뉴 타입 정의
interface Menu {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  description?: string;
}

export default function MealPlansPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const [showBreakfast, setShowBreakfast] = useState<boolean>(false);
  const [showDinner, setShowDinner] = useState<boolean>(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isMealPlanFormOpen, setIsMealPlanFormOpen] = useState<boolean>(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | undefined>(undefined);

  // 메뉴 불러오기
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}/menus`);
        if (!response.ok) {
          throw new Error('메뉴를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setMenus(data);
      } catch (error) {
        console.error('메뉴 로드 오류:', error);
      }
    };
    
    fetchMenus();
  }, [companyId]);

  // 식단 계획 불러오기
  useEffect(() => {
    const fetchMealPlans = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/meal-plans`);
        if (!response.ok) {
          throw new Error('식단 계획을 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        
        // 메뉴 이름 연결
        const plansWithMenuNames = data.map((plan: MealPlan) => {
          const menu = menus.find(m => m.id === plan.menu_id);
          return {
            ...plan,
            menu_name: menu?.name || '알 수 없는 메뉴'
          };
        });
        
        setMealPlans(plansWithMenuNames);
      } catch (error) {
        console.error('식단 계획 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (menus.length > 0) {
      fetchMealPlans();
    }
  }, [companyId, menus]);

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

  // 식단 추가/수정
  const handleSubmitMealPlan = async (data: MealPlan) => {
    try {
      const url = data.id 
        ? `/api/companies/${companyId}/meal-plans/${data.id}` 
        : `/api/companies/${companyId}/meal-plans`;
      
      const method = data.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '식단 저장 중 오류가 발생했습니다.');
      }
      
      // 성공 메시지
      toast({
        title: data.id ? '식단 수정 완료' : '식단 추가 완료',
        description: `${format(new Date(data.date), 'yyyy년 MM월 dd일')} 식단이 ${data.id ? '수정' : '추가'}되었습니다.`,
      });
      
      // 식단 목록 새로고침
      const updatedMenus = [...menus];
      const menuName = updatedMenus.find(m => m.id === data.menu_id)?.name;
      
      if (data.id) {
        // 수정된 식단 업데이트
        setMealPlans(prev => prev.map(plan => 
          plan.id === data.id 
            ? { ...data, menu_name: menuName || '알 수 없는 메뉴' }
            : plan
        ));
      } else {
        // 새 식단 추가
        const newData = await response.json();
        setMealPlans(prev => [...prev, { 
          ...newData,
          menu_name: menuName || '알 수 없는 메뉴'
        }]);
      }
      
      // 폼 닫기
      setIsMealPlanFormOpen(false);
      setSelectedMealPlan(undefined);
    } catch (error) {
      console.error('식단 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 식단 수정
  const handleEditMealPlan = (mealPlan: MealPlan) => {
    setSelectedMealPlan(mealPlan);
    setIsMealPlanFormOpen(true);
  };

  // 식단 삭제
  const handleDeleteMealPlan = async (mealPlanId: string) => {
    if (!confirm('정말 이 식단을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-plans/${mealPlanId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '식단 삭제 중 오류가 발생했습니다.');
      }
      
      // 목록에서 제거
      setMealPlans(prev => prev.filter(plan => plan.id !== mealPlanId));
      
      toast({
        title: '식단 삭제 완료',
        description: '식단이 삭제되었습니다.',
      });
    } catch (error) {
      console.error('식단 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">식단 관리</h1>
        <Button onClick={() => {
          setSelectedMealPlan(undefined);
          setIsMealPlanFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> 식단 추가
        </Button>
      </div>
      
      <Tabs defaultValue="month" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="month" onClick={() => setViewType('month')}>월별</TabsTrigger>
            <TabsTrigger value="week" onClick={() => setViewType('week')}>주별</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={showBreakfast} 
                onChange={() => setShowBreakfast(!showBreakfast)}
                className="rounded text-primary-600"
              />
              <span>아침</span>
            </label>
            <span>점심</span>
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={showDinner} 
                onChange={() => setShowDinner(!showDinner)}
                className="rounded text-primary-600"
              />
              <span>저녁</span>
            </label>
          </div>
        </div>
        
        <TabsContent value="month" className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{format(date, 'yyyy년 MM월', { locale: ko })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={date}
                onMonthChange={setDate}
                locale={ko}
                classNames={{
                  day_selected: "bg-blue-500 text-white",
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
                  }
                }}
              />
            </CardContent>
          </Card>
          
          {/* 선택된 날짜의 식단 정보 */}
          {selectedDate && (
            <Card className="mt-6">
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
                            <span>{plan.menu_name}</span>
                            <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditMealPlan(plan)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => plan.id && handleDeleteMealPlan(plan.id)}
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
                          <span>{plan.menu_name}</span>
                          <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditMealPlan(plan)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => plan.id && handleDeleteMealPlan(plan.id)}
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
                            <span>{plan.menu_name}</span>
                            <span className="flex-1 text-right mr-4">{plan.quantity}인분</span>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditMealPlan(plan)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => plan.id && handleDeleteMealPlan(plan.id)}
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
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="week" className="w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {format(getWeekDateRange(date)[0], 'yyyy년 MM월 dd일', { locale: ko })} - 
                {format(getWeekDateRange(date)[6], 'yyyy년 MM월 dd일', { locale: ko })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {getWeekDateRange(date).map((day, index) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 식단 추가/수정 폼 */}
      <MealPlanForm
        companyId={companyId}
        menus={menus}
        mealPlan={selectedMealPlan}
        isOpen={isMealPlanFormOpen}
        onClose={() => {
          setIsMealPlanFormOpen(false);
          setSelectedMealPlan(undefined);
        }}
        onSubmit={handleSubmitMealPlan}
      />
    </div>
  );
} 