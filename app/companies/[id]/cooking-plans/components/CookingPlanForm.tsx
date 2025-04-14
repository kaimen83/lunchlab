'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MealPlan } from '../../meal-plans/types';
import { CookingPlanFormData } from '../types';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CookingPlanFormProps {
  companyId: string;
  initialDate?: string;
  onSubmit: (data: CookingPlanFormData) => Promise<void>;
}

export default function CookingPlanForm({ companyId, initialDate, onSubmit }: CookingPlanFormProps) {
  const { toast } = useToast();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [mealPortions, setMealPortions] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  
  // 캘린더 컨테이너에 대한 참조
  const calendarRef = useRef<HTMLDivElement>(null);
  // 캘린더 버튼에 대한 참조
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  
  // 현재 컴포넌트가 마운트된 상태인지 추적
  const isMountedRef = useRef<boolean>(true);
  
  // 날짜 객체
  const [dateObj, setDateObj] = useState<Date>(initialDate ? new Date(initialDate) : new Date());

  // 폼 초기화
  const form = useForm<CookingPlanFormData>({
    defaultValues: {
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      meal_portions: [],
    },
  });

  // 선택된 날짜
  const selectedDate = form.watch('date');
  
  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMountedRef.current = true;
    
    // 캘린더 외부 클릭 감지 핸들러
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) && 
        calendarButtonRef.current && 
        !calendarButtonRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 날짜 선택 처리
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date || !isMountedRef.current) return;
    
    setDateObj(date);
    form.setValue('date', format(date, 'yyyy-MM-dd'));
    
    // 캘린더 닫기
    setTimeout(() => {
      if (isMountedRef.current) {
        setShowCalendar(false);
      }
    }, 10);
  }, [form, isMountedRef]);

  // 선택한 날짜 변경 시 해당 날짜의 식단 목록 가져오기
  useEffect(() => {
    const fetchMealPlans = async () => {
      if (!selectedDate) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/meal-plans/by-date?date=${selectedDate}`);
        
        if (!response.ok) {
          throw new Error('식단 정보를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setMealPlans(data);
        
        // 기본 식수 값 초기화 (0명)
        const initialPortions = new Map<string, number>();
        data.forEach((plan: MealPlan) => {
          initialPortions.set(plan.id, 0);
        });
        setMealPortions(initialPortions);
      } catch (error) {
        console.error('식단 조회 오류:', error);
        toast({
          title: '식단 조회 실패',
          description: '해당 날짜의 식단 정보를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMealPlans();
  }, [selectedDate, companyId, toast]);

  // 식수 입력 처리
  const handlePortionChange = (mealPlanId: string, value: string) => {
    const headcount = parseInt(value) || 0;
    // 음수 방지
    if (headcount < 0) return;
    
    const updatedPortions = new Map(mealPortions);
    updatedPortions.set(mealPlanId, headcount);
    setMealPortions(updatedPortions);
  };

  // 제출 처리
  const handleSubmit = async () => {
    if (!selectedDate) {
      toast({
        title: '날짜를 선택해주세요',
        variant: 'destructive',
      });
      return;
    }
    
    // 식수가 0인 식단이 있는지 확인
    let hasNoPortions = true;
    for (const headcount of mealPortions.values()) {
      if (headcount > 0) {
        hasNoPortions = false;
        break;
      }
    }
    
    if (hasNoPortions) {
      toast({
        title: '최소 하나의 식단에 식수를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 폼 데이터 구성
      const formData: CookingPlanFormData = {
        date: selectedDate,
        meal_portions: Array.from(mealPortions.entries()).map(([meal_plan_id, headcount]) => ({
          meal_plan_id,
          headcount
        }))
      };
      
      await onSubmit(formData);
      
      // 날짜 객체로 변환하여 포맷팅
      const dateForDisplay = new Date(selectedDate);
      
      toast({
        title: '조리계획서가 생성되었습니다',
        description: `${format(dateForDisplay, 'yyyy년 MM월 dd일')} 조리계획서가 생성되었습니다.`,
      });
    } catch (error) {
      console.error('조리계획서 생성 오류:', error);
      toast({
        title: '조리계획서 생성 실패',
        description: '조리계획서를 생성하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  // 캘린더 토글
  const toggleCalendar = useCallback(() => {
    setShowCalendar(prev => !prev);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>조리계획서 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 날짜 선택 */}
          <div className="space-y-2">
            <Label>날짜 선택</Label>
            <div className="relative">
              <Button
                ref={calendarButtonRef}
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={toggleCalendar}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(new Date(selectedDate), 'PPP', { locale: ko }) : '날짜를 선택하세요'}
              </Button>
              
              {showCalendar && (
                <div 
                  ref={calendarRef} 
                  className="absolute z-50 mt-2 bg-white border rounded-md shadow-md"
                >
                  <div className="flex justify-between items-center p-2 border-b">
                    <span className="text-sm font-medium">날짜 선택</span>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setShowCalendar(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={handleDateSelect}
                    locale={ko}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* 식단별 식수 입력 */}
          <div className="space-y-2">
            <Label>식단별 식수 입력</Label>
            {isLoading ? (
              <div className="py-4 text-center text-sm text-gray-500">식단 정보를 불러오는 중...</div>
            ) : mealPlans.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                선택한 날짜에 등록된 식단이 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>식사 시간</TableHead>
                    <TableHead>식단명</TableHead>
                    <TableHead className="text-right">식수 (명)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mealPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>{getMealTimeName(plan.meal_time)}</TableCell>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          className="w-24 inline-block text-right"
                          value={mealPortions.get(plan.id) || 0}
                          onChange={(e) => handlePortionChange(plan.id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || isSubmitting || mealPlans.length === 0}
            >
              조리계획서 생성
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 