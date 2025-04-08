'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { MealPlan, Menu } from './components/types';
import { MealPlansCalendar } from './components/MealPlansCalendar';
import { MealPlanDetails } from './components/MealPlanDetails';
import { WeeklyView } from './components/WeeklyView';
import MealPlanForm from './MealPlanForm';

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
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // 화면 크기 감지 훅
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 초기 체크
    checkIsMobile();
    
    // 리사이즈 이벤트에 리스너 추가
    window.addEventListener('resize', checkIsMobile);
    
    // 클린업
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

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
        <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex justify-between items-center'} mb-4`}>
          <TabsList className="mb-2">
            <TabsTrigger value="month" onClick={() => setViewType('month')}>월별</TabsTrigger>
            <TabsTrigger value="week" onClick={() => setViewType('week')}>주별</TabsTrigger>
          </TabsList>
          
          <div className={`flex items-center ${isMobile ? 'justify-start' : 'space-x-4'}`}>
            <label className="flex items-center space-x-2 mr-3">
              <input 
                type="checkbox" 
                checked={showBreakfast} 
                onChange={() => setShowBreakfast(!showBreakfast)}
                className="rounded text-primary-600"
              />
              <span>아침</span>
            </label>
            <span className="mr-3">점심</span>
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
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6`}>
            <MealPlansCalendar
              date={date}
              setDate={setDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              mealPlans={mealPlans}
              isMobile={isMobile}
            />
            
            <MealPlanDetails
              selectedDate={selectedDate}
              showBreakfast={showBreakfast}
              showDinner={showDinner}
              mealPlans={mealPlans}
              isMobile={isMobile}
              onEditMealPlan={handleEditMealPlan}
              onDeleteMealPlan={handleDeleteMealPlan}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="week" className="w-full">
          <WeeklyView
            date={date}
            setDate={setDate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            mealPlans={mealPlans}
            showBreakfast={showBreakfast}
            showDinner={showDinner}
            isMobile={isMobile}
          />
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