'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface Menu {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
}

interface MealPlanMenu {
  id: string;
  meal_plan_id: string;
  menu_id: string;
  menu: Menu;
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

interface MealPlanFormProps {
  companyId: string;
  initialData: MealPlan | null;
  defaultMealTime?: 'breakfast' | 'lunch' | 'dinner';
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MealPlanForm({ 
  companyId, 
  initialData, 
  defaultMealTime = 'lunch', 
  onSave, 
  onCancel 
}: MealPlanFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'dinner'>(defaultMealTime);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMenus, setIsLoadingMenus] = useState<boolean>(true);
  
  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDate(initialData.date ? new Date(initialData.date) : new Date());
      setMealTime(initialData.meal_time || defaultMealTime);
      
      const menuIds = initialData.meal_plan_menus?.map(item => item.menu_id) || [];
      setSelectedMenuIds(menuIds);
    } else {
      // 초기 데이터가 없는 경우 (생성 모드)
      setMealTime(defaultMealTime); // 기본 식사 시간 설정
    }
    
    // 메뉴 목록 로드
    loadMenus();
  }, [initialData, defaultMealTime]);
  
  // 메뉴 목록 로드
  const loadMenus = async () => {
    setIsLoadingMenus(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/menus`);
      
      if (!response.ok) {
        throw new Error('메뉴 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('메뉴 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMenus(false);
    }
  };
  
  // 저장 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: '유효성 검사 오류',
        description: '식단 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!date) {
      toast({
        title: '유효성 검사 오류',
        description: '날짜를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedMenuIds.length === 0) {
      toast({
        title: '유효성 검사 오류',
        description: '최소 1개 이상의 메뉴를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data = {
        name,
        date: format(date, 'yyyy-MM-dd'),
        meal_time: mealTime,
        menu_ids: selectedMenuIds
      };
      
      await onSave(data);
    } catch (error) {
      console.error('식단 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단을 저장하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 메뉴 선택 처리
  const toggleMenuSelection = (menuId: string) => {
    setSelectedMenuIds(prev => {
      if (prev.includes(menuId)) {
        return prev.filter(id => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">식단 이름</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="식단 이름을 입력하세요"
          disabled={isLoading}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>날짜</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="meal-time">식사 시간</Label>
          <Select
            value={mealTime}
            onValueChange={(value) => setMealTime(value as 'breakfast' | 'lunch' | 'dinner')}
            disabled={isLoading}
          >
            <SelectTrigger id="meal-time">
              <SelectValue placeholder="식사 시간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">아침</SelectItem>
              <SelectItem value="lunch">점심</SelectItem>
              <SelectItem value="dinner">저녁</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>메뉴 선택</Label>
        {isLoadingMenus ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : menus.length === 0 ? (
          <div className="border rounded-md p-4 text-center text-sm text-gray-500">
            등록된 메뉴가 없습니다. 먼저 메뉴를 등록해주세요.
          </div>
        ) : (
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-2">
              {menus.map((menu) => (
                <div key={menu.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`menu-${menu.id}`}
                    checked={selectedMenuIds.includes(menu.id)}
                    onCheckedChange={() => toggleMenuSelection(menu.id)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor={`menu-${menu.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <div className="font-medium">{menu.name}</div>
                    {menu.description && (
                      <div className="text-xs text-gray-500 truncate">{menu.description}</div>
                    )}
                  </Label>
                  <div className="text-sm text-gray-500">
                    {new Intl.NumberFormat('ko-KR').format(menu.cost_price)}원
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          취소
        </Button>
        <Button type="submit" disabled={isLoading || isLoadingMenus}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          저장
        </Button>
      </div>
    </form>
  );
} 