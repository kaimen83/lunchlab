'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// 메뉴 타입 정의
interface Menu {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  description?: string;
}

// 식단 계획 타입 정의
interface MealPlan {
  id?: string;
  date: string;
  meal_time: 'breakfast' | 'lunch' | 'dinner';
  menu_id: string;
  quantity: number;
  note?: string;
}

// 폼 검증 스키마
const formSchema = z.object({
  date: z.date({
    required_error: "날짜를 선택해주세요.",
  }),
  meal_time: z.enum(['breakfast', 'lunch', 'dinner'], {
    required_error: "식사 시간을 선택해주세요.",
  }),
  menu_id: z.string({
    required_error: "메뉴를 선택해주세요.",
  }),
  quantity: z.number({
    required_error: "수량을 입력해주세요.",
  }).min(1, "최소 1 이상이어야 합니다."),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MealPlanFormProps {
  companyId: string;
  menus: Menu[];
  mealPlan?: MealPlan; // 편집 시 사용
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MealPlan) => void;
}

export default function MealPlanForm({
  companyId,
  menus,
  mealPlan,
  isOpen,
  onClose,
  onSubmit,
}: MealPlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 폼 기본값 설정
  const defaultValues: Partial<FormValues> = {
    date: mealPlan ? new Date(mealPlan.date) : new Date(),
    meal_time: mealPlan?.meal_time || 'lunch',
    menu_id: mealPlan?.menu_id || '',
    quantity: mealPlan?.quantity || 1,
    note: mealPlan?.note || '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const formattedDate = format(values.date, 'yyyy-MM-dd');
      
      const formData: MealPlan = {
        id: mealPlan?.id,
        date: formattedDate,
        meal_time: values.meal_time,
        menu_id: values.menu_id,
        quantity: values.quantity,
        note: values.note,
      };
      
      onSubmit(formData);
    } catch (error) {
      console.error('식단 저장 중 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mealPlan ? '식단 수정' : '식단 추가'}
          </DialogTitle>
          <DialogDescription>
            {mealPlan 
              ? '식단 정보를 수정하세요.' 
              : '새 식단을 추가하세요.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 날짜 선택 */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>날짜</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'yyyy년 MM월 dd일 (eee)', { locale: ko })
                          ) : (
                            <span>날짜 선택</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 식사 시간 선택 */}
            <FormField
              control={form.control}
              name="meal_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>식사 시간</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="식사 시간 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="breakfast">아침</SelectItem>
                      <SelectItem value="lunch">점심</SelectItem>
                      <SelectItem value="dinner">저녁</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 메뉴 선택 */}
            <FormField
              control={form.control}
              name="menu_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메뉴</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="메뉴 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {menus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 수량 입력 */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량 (인분)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* 메모 입력 */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모 (선택사항)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="추가 메모를 입력하세요"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? '저장 중...' 
                  : (mealPlan ? '수정' : '추가')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 