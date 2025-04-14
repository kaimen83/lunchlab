'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MealPlan } from '../../meal-plans/types';
import { CookingPlanFormData } from '../types';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), 'PPP', { locale: ko }) : '날짜를 선택하세요'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateObj}
                  onSelect={(date) => {
                    if (date) {
                      setDateObj(date);
                      form.setValue('date', format(date, 'yyyy-MM-dd'));
                    }
                  }}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
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