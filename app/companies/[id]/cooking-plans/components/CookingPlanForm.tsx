'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X, AlertTriangle } from 'lucide-react';
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
  isEditing?: boolean;
}

export default function CookingPlanForm({ companyId, initialDate, onSubmit, isEditing = false }: CookingPlanFormProps) {
  const { toast } = useToast();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [mealPortions, setMealPortions] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [hasExistingData, setHasExistingData] = useState<boolean>(false);
  
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

  // 기존 조리계획서 데이터 확인
  const checkExistingCookingPlan = useCallback(async (date: string) => {
    if (!date || isEditing) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/cooking-plans?date=${date}`);
      
      // 404인 경우 기존 데이터 없음
      if (response.status === 404) {
        setHasExistingData(false);
        return;
      }
      
      // 성공적으로 데이터를 가져온 경우 기존 데이터 있음
      if (response.ok) {
        setHasExistingData(true);
        return;
      }
      
      setHasExistingData(false);
    } catch (error) {
      console.error('기존 조리계획서 확인 오류:', error);
      setHasExistingData(false);
    }
  }, [companyId, isEditing]);

  // 선택한 날짜 변경 시 해당 날짜의 식단 목록 가져오기
  useEffect(() => {
    const fetchMealPlans = async () => {
      if (!selectedDate) return;
      
      setIsLoading(true);
      try {
        // 기존 조리계획서 데이터 확인
        await checkExistingCookingPlan(selectedDate);
        
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
        
        // 수정 모드일 경우 기존 식수 데이터 불러오기
        if (isEditing && selectedDate) {
          try {
            const cookingPlanResponse = await fetch(`/api/companies/${companyId}/cooking-plans?date=${selectedDate}`);
            
            if (cookingPlanResponse.ok) {
              const cookingPlanData = await cookingPlanResponse.json();
              
              // 기존 식수 데이터 설정
              if (cookingPlanData?.meal_portions && cookingPlanData.meal_portions.length > 0) {
                cookingPlanData.meal_portions.forEach((portion: any) => {
                  if (initialPortions.has(portion.meal_plan_id)) {
                    initialPortions.set(portion.meal_plan_id, portion.headcount);
                  }
                });
              }
            }
          } catch (error) {
            console.error('기존 조리계획서 조회 오류:', error);
          }
        }
        
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
  }, [selectedDate, companyId, toast, isEditing, checkExistingCookingPlan]);

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
        meal_portions: Array.from(mealPortions.entries())
          .filter(([_, headcount]) => headcount > 0) // 식수가 0인 항목은 제외
          .map(([meal_plan_id, headcount]) => ({
            meal_plan_id,
            headcount
          }))
      };
      
      await onSubmit(formData);
      
      // 날짜 객체로 변환하여 포맷팅
      const dateForDisplay = new Date(selectedDate);
      
      toast({
        title: isEditing ? '조리계획서가 수정되었습니다' : '조리계획서가 생성되었습니다',
        description: `${format(dateForDisplay, 'yyyy년 MM월 dd일')} 조리계획서가 ${isEditing ? '수정' : '생성'}되었습니다.`,
      });
    } catch (error) {
      console.error(isEditing ? '조리계획서 수정 오류:' : '조리계획서 생성 오류:', error);
      toast({
        title: isEditing ? '조리계획서 수정 실패' : '조리계획서 생성 실패',
        description: '조리계획서를 처리하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 식사 시간 한글화
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>에러</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {hasExistingData && !isEditing && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700 font-bold">주의: 선택한 날짜에 이미 조리계획서가 있습니다</AlertTitle>
          <AlertDescription className="text-amber-600">
            계속 진행하면 기존 데이터가 삭제되고 새로 작성한 데이터로 대체됩니다.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? '조리계획서 수정' : '새 조리계획서 작성'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* 날짜 선택 */}
            <div>
              <Label htmlFor="plan-date">날짜 선택</Label>
              <div className="flex mt-2 relative">
                <Button
                  ref={calendarButtonRef}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  onClick={() => setShowCalendar(true)}
                  disabled={isEditing} // 수정 모드에서는 날짜 변경 비활성화
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(dateObj, "yyyy년 MM월 dd일 (EEEE)", { locale: ko })
                  ) : (
                    <span>날짜를 선택하세요</span>
                  )}
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
                      disabled={isLoading || isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 조리지시서 입력 */}
            <div>
              <h3 className="text-lg font-medium mb-4">조리지시서</h3>
              
              {isLoading ? (
                <p className="text-center text-gray-500 py-4">식단 정보를 불러오는 중...</p>
              ) : mealPlans.length === 0 ? (
                <p className="text-center text-yellow-600 py-4">
                  선택한 날짜에 등록된 식단이 없습니다.
                </p>
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
                    {mealPlans.map((mealPlan) => (
                      <TableRow key={mealPlan.id}>
                        <TableCell>
                          {getMealTimeName(mealPlan.meal_time)}
                        </TableCell>
                        <TableCell>
                          {mealPlan.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={mealPortions.get(mealPlan.id) || 0}
                            onChange={(e) => handlePortionChange(mealPlan.id, e.target.value)}
                            className="w-24 ml-auto text-right"
                            disabled={isSubmitting}
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
                {isSubmitting ? '처리 중...' : isEditing ? '수정하기' : '생성하기'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 