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
import { CalendarIcon, Loader2, Search, Package, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { MealPlan, MealPlanMenu } from '../types';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Menu {
  id: string;
  name: string;
  description: string | null;
}

interface Container {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  menu: Menu;
  container: Container;
  ingredients_cost: number;
  container_price: number;
  total_cost: number;
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
  containerId: string;
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
  const [containers, setContainers] = useState<Container[]>([]);
  const [menuContainers, setMenuContainers] = useState<MenuContainer[]>([]);
  const [containerSearchTerm, setContainerSearchTerm] = useState<string>('');
  const [menuSearchTerm, setMenuSearchTerm] = useState<string>('');
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [containerMenuSelections, setContainerMenuSelections] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [selectedContainerForMenu, setSelectedContainerForMenu] = useState<string | null>(null);
  const [isMenuSelectOpen, setIsMenuSelectOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMenus, setIsLoadingMenus] = useState<boolean>(true);
  const [isLoadingContainers, setIsLoadingContainers] = useState<boolean>(true);
  const [isLoadingMenuContainers, setIsLoadingMenuContainers] = useState<boolean>(true);
  
  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDate(initialData.date ? new Date(initialData.date) : new Date());
      setMealTime(initialData.meal_time || defaultMealTime);
      
      if (initialData.meal_plan_menus?.length) {
        // 기존 식단에서 사용된 용기 목록 추출
        const selectedContainerIds: string[] = [];
        const containerMenuMap: Record<string, string> = {};
        
        initialData.meal_plan_menus.forEach(item => {
          if (item.container_id) {
            selectedContainerIds.push(item.container_id);
            containerMenuMap[item.container_id] = item.menu_id;
          }
        });
        
        setSelectedContainers(selectedContainerIds);
        setContainerMenuSelections(containerMenuMap);
      }
    } else {
      // 초기 데이터가 없는 경우 (생성 모드)
      setMealTime(defaultMealTime); // 기본 식사 시간 설정
    }
    
    // 용기 목록 로드
    loadContainers();
    // 메뉴-용기 연결 정보 로드
    loadMenuContainers();
  }, [initialData, defaultMealTime, companyId]);

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
  
  // 메뉴-용기 연결 정보 로드
  const loadMenuContainers = async () => {
    setIsLoadingMenuContainers(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/menu-containers`);
      
      if (!response.ok) {
        throw new Error('메뉴-용기 연결 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMenuContainers(data);
      setIsLoadingMenus(false); // 메뉴 정보도 함께 로드되므로 메뉴 로딩 상태도 업데이트
    } catch (error) {
      console.error('메뉴-용기 연결 정보 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴-용기 연결 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMenuContainers(false);
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
    
    if (selectedContainers.length === 0) {
      toast({
        title: '유효성 검사 오류',
        description: '최소 1개 이상의 용기를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    // 선택된 모든 용기에 메뉴가 할당되었는지 확인
    const unassignedContainers = selectedContainers.filter(
      containerId => !containerMenuSelections[containerId]
    );
    
    if (unassignedContainers.length > 0) {
      toast({
        title: '유효성 검사 오류',
        description: '모든 용기에 메뉴를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 메뉴 선택과 용기 선택을 API 요구 형식으로 변환
      const menu_selections = selectedContainers.map(containerId => ({
        menuId: containerMenuSelections[containerId],
        containerId
      }));
      
      const data = {
        name,
        date: format(date, 'yyyy-MM-dd'),
        meal_time: mealTime,
        menu_selections
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
  
  // 용기 선택 처리
  const toggleContainerSelection = (containerId: string) => {
    // 이미 선택되어 있는지 확인
    const isAlreadySelected = selectedContainers.includes(containerId);
    
    if (isAlreadySelected) {
      // 선택 해제: 먼저 선택된 용기 목록에서 제거
      setSelectedContainers(prev => prev.filter(id => id !== containerId));
      
      // 그 다음 메뉴 연결 정보도 제거 (별도의 상태 업데이트로 분리)
      setContainerMenuSelections(prev => {
        const updated = { ...prev };
        delete updated[containerId];
        return updated;
      });
    } else {
      // 선택 추가: 선택된 용기 목록에 추가
      setSelectedContainers(prev => [...prev, containerId]);
    }
  };

  // 용기에 메뉴 할당
  const handleMenuSelection = (containerId: string, menuId: string) => {
    setContainerMenuSelections(prev => ({
      ...prev,
      [containerId]: menuId
    }));
    setIsMenuSelectOpen(false);
  };
  
  // 용기 검색
  const filteredContainers = containers.filter(container => 
    container.name.toLowerCase().includes(containerSearchTerm.toLowerCase()) ||
    (container.description && container.description.toLowerCase().includes(containerSearchTerm.toLowerCase()))
  );
  
  // 특정 메뉴가 특정 용기와 호환되는지 확인
  const isMenuCompatibleWithContainer = (menuId: string, containerId: string) => {
    return menuContainers.some(mc => mc.menu_id === menuId && mc.container_id === containerId);
  };
  
  // 메뉴 검색 필터링
  const getFilteredMenusForContainer = (containerId: string) => {
    // 먼저 해당 용기와 연결된 모든 메뉴 조회
    const compatibleMenuContainers = menuContainers.filter(mc => mc.container_id === containerId);
    
    // 모든 메뉴 ID 추출
    const allMenuIds = Array.from(new Set(menuContainers.map(mc => mc.menu_id)));
    
    // 호환되는 메뉴 ID 추출
    const compatibleMenuIds = compatibleMenuContainers.map(mc => mc.menu_id);
    
    // 모든 메뉴를 가져오되, 검색어로 필터링하고 호환되는 메뉴를 우선 정렬
    return allMenuIds
      .map(menuId => {
        const menuContainer = menuContainers.find(mc => mc.menu_id === menuId);
        return menuContainer?.menu;
      })
      .filter((menu): menu is Menu => !!menu && (
        menu.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
        (menu.description && menu.description.toLowerCase().includes(menuSearchTerm.toLowerCase()))
      ))
      .sort((a, b) => {
        const aIsCompatible = compatibleMenuIds.includes(a.id);
        const bIsCompatible = compatibleMenuIds.includes(b.id);
        
        if (aIsCompatible && !bIsCompatible) return -1;
        if (!aIsCompatible && bIsCompatible) return 1;
        return 0;
      });
  };

  // 용기 정보 가져오기
  const getContainerDetailsById = (containerId: string) => {
    return containers.find(container => container.id === containerId);
  };

  // 메뉴 정보 가져오기
  const getMenuDetailsById = (menuId: string) => {
    const menuContainer = menuContainers.find(mc => mc.menu_id === menuId);
    return menuContainer?.menu;
  };

  // 원가 정보 가져오기
  const getCostInfoForMenuAndContainer = (menuId: string, containerId: string) => {
    const menuContainer = menuContainers.find(
      mc => mc.menu_id === menuId && mc.container_id === containerId
    );
    
    if (!menuContainer) {
      return {
        ingredients_cost: 0,
        total_cost: 0
      };
    }
    
    return {
      ingredients_cost: menuContainer.ingredients_cost,
      total_cost: menuContainer.total_cost
    };
  };

  // 포맷된 가격 표시
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // 컨테이너 이름으로 정렬
  const sortedSelectedContainers = [...selectedContainers].sort((a, b) => {
    const containerA = getContainerDetailsById(a);
    const containerB = getContainerDetailsById(b);
    
    return (containerA?.name || '').localeCompare(containerB?.name || '');
  });
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger 
            value="menus" 
            disabled={selectedContainers.length === 0}
            className="relative"
          >
            용기/메뉴 선택
            {selectedContainers.length > 0 && (
              <Badge className="ml-2 bg-primary text-white">{selectedContainers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>식단 기본 정보</CardTitle>
              <CardDescription>식단의 기본 정보를 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label>용기 선택</Label>
                {isLoadingContainers ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="용기 검색..."
                        className="pl-9"
                        value={containerSearchTerm}
                        onChange={(e) => setContainerSearchTerm(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <ScrollArea className="h-40 border rounded-md">
                      <div className="p-2">
                        {filteredContainers.length > 0 ? (
                          filteredContainers.map(container => (
                            <div key={container.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-md">
                              <Checkbox
                                id={`container-${container.id}`}
                                checked={selectedContainers.includes(container.id)}
                                onCheckedChange={() => toggleContainerSelection(container.id)}
                              />
                              <div className="flex-1">
                                <label htmlFor={`container-${container.id}`} className="text-sm font-medium cursor-pointer">{container.name}</label>
                                {container.description && (
                                  <p className="text-xs text-muted-foreground">{container.description}</p>
                                )}
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
                취소
              </Button>
              {selectedContainers.length > 0 && (
                <Button type="button" onClick={() => setActiveTab("menus")}>
                  다음: 메뉴 선택
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="menus" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>메뉴 선택</CardTitle>
              <CardDescription>각 용기에 담을 메뉴를 선택해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMenus || isLoadingMenuContainers ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedSelectedContainers.map(containerId => {
                    const containerDetails = getContainerDetailsById(containerId);
                    const selectedMenuId = containerMenuSelections[containerId];
                    const menuDetails = selectedMenuId ? getMenuDetailsById(selectedMenuId) : null;
                    const costInfo = selectedMenuId 
                      ? getCostInfoForMenuAndContainer(selectedMenuId, containerId)
                      : { total_cost: 0, ingredients_cost: 0 };
                    
                    return (
                      <div 
                        key={containerId}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/10"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{containerDetails?.name}</div>
                          {selectedMenuId ? (
                            <div className="text-sm text-muted-foreground flex items-center mt-1">
                              <span className="mr-2">{menuDetails?.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {formatPrice(costInfo.total_cost)}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="text-xs mt-1">
                              메뉴 미선택
                            </Badge>
                          )}
                        </div>
                        
                        <Dialog open={isMenuSelectOpen && selectedContainerForMenu === containerId} onOpenChange={(open) => {
                          if (!open) setIsMenuSelectOpen(false);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedContainerForMenu(containerId);
                                setIsMenuSelectOpen(true);
                                setMenuSearchTerm('');
                              }}
                            >
                              {selectedMenuId ? '메뉴 변경' : '메뉴 선택'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>
                                {containerDetails?.name}에 담을 메뉴 선택
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="메뉴 검색..."
                                  className="pl-9"
                                  value={menuSearchTerm}
                                  onChange={(e) => setMenuSearchTerm(e.target.value)}
                                />
                              </div>
                              <ScrollArea className="h-72 border rounded-md">
                                <div className="p-2">
                                  {getFilteredMenusForContainer(containerId).length > 0 ? (
                                    getFilteredMenusForContainer(containerId).map(menu => {
                                      const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId);
                                      const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId);
                                      
                                      return (
                                        <div 
                                          key={menu.id} 
                                          className={cn(
                                            "flex flex-col p-3 border-b last:border-0 cursor-pointer hover:bg-accent/20",
                                            selectedMenuId === menu.id && "bg-accent/30"
                                          )}
                                          onClick={() => handleMenuSelection(containerId, menu.id)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                              <span className="font-medium">{menu.name}</span>
                                              {isCompatible && (
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                  호환
                                                </Badge>
                                              )}
                                            </div>
                                            <span className="text-sm font-medium">
                                              {formatPrice(costInfo.total_cost)}
                                            </span>
                                          </div>
                                          {menu.description && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {menu.description}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                      검색 결과가 없습니다
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {selectedContainers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  먼저 용기를 선택해주세요.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setActiveTab("basic")} disabled={isLoading}>
                이전 단계
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? '수정' : '추가'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
} 