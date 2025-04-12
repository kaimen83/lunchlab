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
import { CalendarIcon, Loader2, Search, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { MealPlan, MealPlanMenu } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Menu {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
}

interface Container {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface MealPlanFormProps {
  companyId: string;
  initialData: MealPlan | null;
  defaultMealTime?: 'breakfast' | 'lunch' | 'dinner';
  onSave: (data: any) => void;
  onCancel: () => void;
}

interface MenuSelectionWithContainer {
  menuId: string;
  containerId: string | null;
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
  const [containers, setContainers] = useState<Container[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMenus, setSelectedMenus] = useState<MenuSelectionWithContainer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMenus, setIsLoadingMenus] = useState<boolean>(true);
  const [isLoadingContainers, setIsLoadingContainers] = useState<boolean>(true);
  
  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDate(initialData.date ? new Date(initialData.date) : new Date());
      setMealTime(initialData.meal_time || defaultMealTime);
      
      if (initialData.meal_plan_menus?.length) {
        const initialMenuSelections = initialData.meal_plan_menus.map(item => ({
          menuId: item.menu_id,
          containerId: item.container_id || null,
        }));
        setSelectedMenus(initialMenuSelections);
      }
    } else {
      // 초기 데이터가 없는 경우 (생성 모드)
      setMealTime(defaultMealTime); // 기본 식사 시간 설정
    }
    
    // 메뉴 목록 로드
    loadMenus();
    // 용기 목록 로드
    loadContainers();
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

  // 용기 목록 로드
  const loadContainers = async () => {
    setIsLoadingContainers(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setContainers(data);
    } catch (error) {
      console.error('용기 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingContainers(false);
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
    
    if (selectedMenus.length === 0) {
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
        menu_selections: selectedMenus
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
    setSelectedMenus(prev => {
      const existingMenuIndex = prev.findIndex(m => m.menuId === menuId);
      
      if (existingMenuIndex >= 0) {
        // 이미 선택된 메뉴이면 제거
        return prev.filter(m => m.menuId !== menuId);
      } else {
        // 새로 선택된 메뉴이면 추가 (기본 용기는 null)
        return [...prev, { menuId, containerId: null }];
      }
    });
  };

  // 메뉴 용기 선택 처리
  const handleContainerSelection = (menuId: string, containerId: string | null) => {
    setSelectedMenus(prev => 
      prev.map(item => 
        item.menuId === menuId 
          ? { ...item, containerId }
          : item
      )
    );
  };
  
  // 메뉴 검색 처리
  const filteredMenus = menus.filter(menu => 
    menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (menu.description && menu.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // 선택된 메뉴 카운트
  const selectedMenuCount = selectedMenus.length;

  // 선택된 메뉴 정보 가져오기
  const getMenuDetailsById = (menuId: string) => {
    return menus.find(menu => menu.id === menuId);
  };

  // 용기 정보 가져오기
  const getContainerDetailsById = (containerId: string) => {
    return containers.find(container => container.id === containerId);
  };

  // 포맷된 가격 표시
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(price);
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
        <div className="flex items-center justify-between">
          <Label>메뉴 선택</Label>
          {selectedMenuCount > 0 && (
            <span className="text-xs text-blue-600 font-medium">{selectedMenuCount}개 선택됨</span>
          )}
        </div>
        
        {isLoadingMenus ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="메뉴 검색..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2">
                {filteredMenus.length > 0 ? (
                  filteredMenus.map(menu => (
                    <div key={menu.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer" onClick={() => toggleMenuSelection(menu.id)}>
                      <Checkbox
                        id={`menu-${menu.id}`}
                        checked={selectedMenus.some(m => m.menuId === menu.id)}
                        onCheckedChange={() => toggleMenuSelection(menu.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`menu-${menu.id}`} className="text-sm font-medium cursor-pointer">{menu.name}</label>
                        {menu.description && (
                          <p className="text-xs text-muted-foreground">{menu.description}</p>
                        )}
                        <div className="text-xs font-medium text-blue-600 mt-1">
                          {formatPrice(menu.cost_price)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">검색 결과가 없습니다</div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {selectedMenus.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>선택된 메뉴 및 용기 설정</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span>정보</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">각 메뉴에 사용할 용기를 선택하세요. 용기 선택은 선택사항이며, 비용 계산에 포함됩니다.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {isLoadingContainers ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>메뉴</TableHead>
                      <TableHead>용기</TableHead>
                      <TableHead>금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMenus.map((selectedMenu) => {
                      const menuDetails = getMenuDetailsById(selectedMenu.menuId);
                      const containerDetails = selectedMenu.containerId 
                        ? getContainerDetailsById(selectedMenu.containerId) 
                        : null;
                      const totalPrice = (menuDetails?.cost_price || 0) + (containerDetails?.price || 0);

                      return (
                        <TableRow key={selectedMenu.menuId}>
                          <TableCell className="font-medium">
                            {menuDetails?.name || '알 수 없는 메뉴'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={selectedMenu.containerId || ''}
                              onValueChange={(value) => handleContainerSelection(
                                selectedMenu.menuId, 
                                value ? value : null
                              )}
                              disabled={isLoading}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="용기 선택(선택사항)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">용기 없음</SelectItem>
                                {containers.map((container) => (
                                  <SelectItem key={container.id} value={container.id}>
                                    {container.name} ({formatPrice(container.price)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold">{formatPrice(totalPrice)}</span>
                              {containerDetails && (
                                <span className="text-xs text-muted-foreground">
                                  메뉴: {formatPrice(menuDetails?.cost_price || 0)} + 
                                  용기: {formatPrice(containerDetails.price)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          취소
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? '수정' : '추가'}
        </Button>
      </div>
    </form>
  );
} 