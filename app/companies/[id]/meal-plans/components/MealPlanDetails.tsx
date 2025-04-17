'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { FilePen, Trash2, Package, ChevronDown, ChevronUp, Loader2, Info, Calendar, Clock, CircleDollarSign, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { MealPlan } from '../types';
import { getMealTimeName, calculateMealPlanCost, formatCurrency } from '../utils';

interface MealPlanDetailsProps {
  mealPlan: MealPlan;
  onEdit: () => void;
  onDelete: () => void;
}

// 메뉴 상세 정보 응답 타입
interface MenuDetailsResponse {
  menu_id: string;
  container_id: string | null;
  cost: number;
  calories: number;
  container: {
    id: string;
    name: string;
    description: string | null;
    price: number;
  } | null;
}

export default function MealPlanDetails({ mealPlan, onEdit, onDelete }: MealPlanDetailsProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [menuDetails, setMenuDetails] = useState<Record<string, MenuDetailsResponse>>({});
  const [loadingMenus, setLoadingMenus] = useState<Record<string, boolean>>({});
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [isLoadingCalories, setIsLoadingCalories] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // 컴포넌트 마운트 시 화면 크기 감지
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 초기 상태 설정
    checkIfMobile();
    
    // 리사이즈 이벤트 핸들러 등록
    window.addEventListener('resize', checkIfMobile);
    
    // 클린업
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // 컴포넌트 마운트 시 모든 메뉴의 칼로리 정보를 한 번에 로드
  useEffect(() => {
    const loadAllMenuDetails = async () => {
      if (!mealPlan.meal_plan_menus || mealPlan.meal_plan_menus.length === 0) {
        setIsLoadingCalories(false);
        return;
      }

      setIsLoadingCalories(true);
      
      try {
        // 병렬로 메뉴 상세 정보를 로드
        const loadedDetails = await loadMenuDetailsInParallel();
        
        // 총 칼로리 계산
        const caloriesSum = Object.values(loadedDetails).reduce(
          (sum, detail) => sum + (detail.calories || 0), 
          0
        );
        
        setTotalCalories(caloriesSum);
      } catch (error) {
        console.error('메뉴 상세 정보 로드 오류:', error);
        setTotalCalories(0);
      } finally {
        setIsLoadingCalories(false);
      }
    };
    
    // 메뉴 상세 정보를 병렬로 로드하는 함수
    const loadMenuDetailsInParallel = async () => {
      const detailsMap: Record<string, MenuDetailsResponse> = {};
      const companyId = mealPlan.company_id;
      
      // 모든 메뉴에 대한 API 요청 배열 생성
      const requests = mealPlan.meal_plan_menus.map(async (item) => {
        const cacheKey = `${item.menu_id}-${item.container_id}`;
        
        try {
          const response = await fetch(`/api/companies/${companyId}/meal-plans/menus/details/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              menu_id: item.menu_id,
              container_id: item.container_id || null
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return { cacheKey, data };
          } else {
            console.warn(`메뉴 ${item.menu_id} 상세 정보 로드 실패:`, await response.text());
            return { cacheKey, data: null };
          }
        } catch (error) {
          console.error(`메뉴 ${item.menu_id} 상세 정보 로드 오류:`, error);
          return { cacheKey, data: null };
        }
      });
      
      // 모든 요청을 병렬로 처리
      const results = await Promise.all(requests);
      
      // 결과를 detailsMap에 병합
      results.forEach(result => {
        if (result.data) {
          detailsMap[result.cacheKey] = result.data;
        }
      });
      
      setMenuDetails(detailsMap);
      return detailsMap;
    };
    
    loadAllMenuDetails();
  }, [mealPlan]);
  
  // 메뉴 확장 토글 함수
  const toggleMenuExpand = async (menuId: string, containerIdOrNull: string | null | undefined) => {
    const containerId = containerIdOrNull || null;
    const cacheKey = `${menuId}-${containerId}`;
    
    // 이미 확장되어 있으면 접기
    if (expandedMenus[cacheKey]) {
      setExpandedMenus({
        ...expandedMenus,
        [cacheKey]: false
      });
      return;
    }
    
    // 이미 상세 정보가 있으면 바로 확장
    if (menuDetails[cacheKey]) {
      setExpandedMenus({
        ...expandedMenus,
        [cacheKey]: true
      });
      return;
    }
    
    // 로딩 상태 설정
    setLoadingMenus({
      ...loadingMenus,
      [cacheKey]: true
    });
    
    // 상세 정보 로드
    try {
      const companyId = mealPlan.company_id;
      const response = await fetch(`/api/companies/${companyId}/meal-plans/menus/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menu_id: menuId,
          container_id: containerId
        })
      });
      
      if (!response.ok) {
        throw new Error('메뉴 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 상세 정보 저장
      setMenuDetails({
        ...menuDetails,
        [cacheKey]: data
      });
      
      // 확장 상태 업데이트
      setExpandedMenus({
        ...expandedMenus,
        [cacheKey]: true
      });
    } catch (error) {
      console.error('메뉴 상세 정보 로드 오류:', error);
    } finally {
      // 로딩 상태 해제
      setLoadingMenus({
        ...loadingMenus,
        [cacheKey]: false
      });
    }
  };
  
  // 총 원가 계산 함수 (캐시된 상세 정보 활용)
  const calculateTotalCost = () => {
    if (!mealPlan.meal_plan_menus) {
      return 0;
    }
    
    // 식재료 원가 계산
    let ingredientsCost = 0;
    // 사용된 용기 ID 추적 (중복 계산 방지)
    const usedContainers = new Set<string>();
    
    mealPlan.meal_plan_menus.forEach(item => {
      const cacheKey = `${item.menu_id}-${item.container_id}`;
      
      // 식재료 원가 계산
      if (menuDetails[cacheKey]) {
        // 캐시된 상세 정보가 있으면 사용
        ingredientsCost += menuDetails[cacheKey].cost;
      } else {
        // 캐시된 정보가 없으면 기존 방식대로 계산
        let itemCost = 0;
        
        // 용기 ID 확인
        const containerId = item.container_id;
        
        if (containerId && item.menu.menu_containers) {
          // 현재 메뉴와 용기에 해당하는 원가 정보 찾기
          const menuContainer = item.menu.menu_containers.find(
            mc => mc.menu_id === item.menu_id && mc.container_id === containerId
          );
          
          if (menuContainer && menuContainer.ingredients_cost > 0) {
            // 특정 메뉴-용기 조합에 대한 원가 사용
            itemCost = menuContainer.ingredients_cost;
          } else if (item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
            // 메뉴 원가 기록 사용
            const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
              if (!a.recorded_at || !b.recorded_at) return 0;
              return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
            });
            const latestPrice = sortedHistory[0].cost_price;
            itemCost = typeof latestPrice === 'number' ? latestPrice : 0;
          }
        } else if (item.menu && item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
          // 메뉴 원가 기록 사용
          const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
            if (!a.recorded_at || !b.recorded_at) return 0;
            return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
          });
          const latestPrice = sortedHistory[0].cost_price;
          itemCost = typeof latestPrice === 'number' ? latestPrice : 0;
        }
        
        ingredientsCost += itemCost;
      }
      
      // 용기 ID 추적 (중복 계산 방지)
      if (item.container_id) {
        usedContainers.add(item.container_id);
      }
    });
    
    // 용기 원가 계산 (중복 없이)
    let containersCost = 0;
    
    usedContainers.forEach(containerId => {
      // 해당 용기 ID를 가진 메뉴 아이템 찾기
      const menuItemWithContainer = mealPlan.meal_plan_menus.find(
        item => item.container_id === containerId
      );
      
      // 용기 가격 추가
      if (menuItemWithContainer?.container?.price) {
        containersCost += menuItemWithContainer.container.price;
      }
    });
    
    // 총 원가 = 식재료 원가 + 용기 원가
    return ingredientsCost + containersCost;
  };
  
  // 용기 원가만 계산하는 함수
  const calculateContainersCost = () => {
    if (!mealPlan.meal_plan_menus) {
      return 0;
    }
    
    // 사용된 용기 ID 추적 (중복 계산 방지)
    const usedContainers = new Set<string>();
    
    // 사용된 모든 용기 ID 수집
    mealPlan.meal_plan_menus.forEach(item => {
      if (item.container_id) {
        usedContainers.add(item.container_id);
      }
    });
    
    // 용기 원가 계산
    let containersCost = 0;
    
    usedContainers.forEach(containerId => {
      // 해당 용기 ID를 가진 메뉴 아이템 찾기
      const menuItemWithContainer = mealPlan.meal_plan_menus.find(
        item => item.container_id === containerId
      );
      
      // 용기 가격 추가
      if (menuItemWithContainer?.container?.price) {
        containersCost += menuItemWithContainer.container.price;
      }
    });
    
    return containersCost;
  };
  
  // 총 칼로리 계산 함수 - 캐시된 값 사용
  const calculateTotalCalories = () => {
    return totalCalories;
  };

  // 모바일 버전 렌더링
  if (isMobile) {
    return (
      <div className="space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{mealPlan.name}</h3>
          <Badge variant="outline">{getMealTimeName(mealPlan.meal_time)}</Badge>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-2">포함 메뉴 ({mealPlan.meal_plan_menus.length}개)</h4>
          {mealPlan.meal_plan_menus.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {mealPlan.meal_plan_menus.map((item) => {
                const cacheKey = `${item.menu_id}-${item.container_id}`;
                const isExpanded = expandedMenus[cacheKey] || false;
                const isLoading = loadingMenus[cacheKey] || false;
                const details = menuDetails[cacheKey];
                
                return (
                  <li key={item.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium">{item.menu.name}</div>
                        {item.menu.description && (
                          <p className="text-xs text-muted-foreground">{item.menu.description}</p>
                        )}
                        
                        {item.container && (
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Package className="h-3 w-3 mr-1" />
                            <span>{item.container.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                        onClick={() => toggleMenuExpand(item.menu_id, item.container_id)}
                        aria-expanded={isExpanded}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {isExpanded && details && (
                      <div className="pt-2 mt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">원가:</span>
                          <div className="font-medium">{formatCurrency(details.cost)}</div>
                        </div>
                        
                        {details.calories > 0 && (
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm">칼로리:</span>
                            <Badge variant="outline" className="bg-white">
                              {Math.round(details.calories)} kcal
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="font-medium text-lg">
            총 비용: {formatCurrency(calculateTotalCost())}
          </div>
          <div className="font-medium text-lg">
            총 칼로리: {isLoadingCalories ? (
              <span className="text-sm text-muted-foreground">로딩 중...</span>
            ) : (
              `${Math.round(calculateTotalCalories())} kcal`
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" size="sm" className="gap-1 shadow-sm hover:bg-gray-100" onClick={onEdit}>
            <FilePen className="h-4 w-4" />
            수정
          </Button>
          <Button variant="destructive" size="sm" className="gap-1 shadow-sm hover:bg-red-700" onClick={() => setShowDeleteAlert(true)}>
            <Trash2 className="h-4 w-4" />
            삭제
          </Button>
        </div>
        
        {/* 삭제 확인 대화상자 */}
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>식단 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말 이 식단을 삭제하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border border-gray-200 shadow-sm hover:bg-gray-100">취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowDeleteAlert(false);
                  onDelete();
                }}
                className="bg-red-600 text-white shadow-sm hover:bg-red-700"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
  
  // 데스크탑 버전 렌더링
  return (
    <div className="space-y-6 py-2 overflow-y-auto px-1 md:px-4">
      {/* 포함 메뉴 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="font-medium">식단 메뉴 목록</h4>
        </div>
        
        {mealPlan.meal_plan_menus.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Package className="h-12 w-12 text-gray-300 mb-2" />
            <p>등록된 메뉴가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {mealPlan.meal_plan_menus.map((item) => {
                const cacheKey = `${item.menu_id}-${item.container_id}`;
                const isExpanded = expandedMenus[cacheKey] || false;
                const isLoading = loadingMenus[cacheKey] || false;
                const details = menuDetails[cacheKey];
                
                return (
                  <Card key={item.id} className="border border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 pt-3 px-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-base">{item.menu.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 hover:bg-gray-100 rounded-md text-xs flex items-center gap-1 -mt-1 -mr-2"
                          onClick={() => toggleMenuExpand(item.menu_id, item.container_id)}
                          aria-expanded={isExpanded}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>로딩 중</span>
                            </>
                          ) : isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              <span>접기</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              <span>상세 정보</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-2 pb-3">
                      {item.menu.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.menu.description}</p>
                      )}
                      
                      {item.container && !isExpanded && (
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Package className="h-3 w-3 mr-1" />
                          <span>{item.container.name}</span>
                        </div>
                      )}
                      
                      {isExpanded && details && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex items-center gap-1.5">
                            <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">원가:</span>
                            <div className="text-sm">{formatCurrency(details.cost)}</div>
                          </div>
                          
                          {details.calories > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">칼로리:</span>
                              <div className="text-sm">{Math.round(details.calories)} kcal</div>
                            </div>
                          )}
                          
                          {details.container && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">용기:</span>
                              <div className="text-sm">{details.container.name} ({formatCurrency(details.container.price)})</div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* 식단 원가 정보 */}
      <div className="space-y-2">       
        {/* 영양 정보 */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            <h3 className="text-md font-semibold">영양 정보</h3>
          </div>
          
          <div className="flex flex-col gap-1 text-gray-700 ml-7">
            <div className="flex justify-between text-sm">
              <span>총 칼로리:</span>
              <span>{isLoadingCalories ? (
                <span className="flex items-center text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  계산 중...
                </span>
              ) : (
                `${totalCalories.toFixed(1)} kcal`
              )}</span>
            </div>
          </div>
        </div>
        
        {/* 식단 원가 정보 */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <CircleDollarSign className="h-5 w-5 text-blue-500" />
            <h3 className="text-md font-semibold">원가 정보</h3>
          </div>
          
          <div className="flex flex-col gap-1 text-gray-700 ml-7">
            <div className="flex justify-between text-sm">
              <span>식재료 원가:</span>
              <span>{isLoadingCalories ? '계산 중...' : formatCurrency(calculateTotalCost() - calculateContainersCost())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>용기 원가:</span>
              <span>{isLoadingCalories ? '계산 중...' : formatCurrency(calculateContainersCost())}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-medium">
              <span>총 원가:</span>
              <span>{isLoadingCalories ? '계산 중...' : formatCurrency(calculateTotalCost())}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ※ 용기가 중복 사용되는 경우 원가는 한 번만 계산됩니다.
            </div>
          </div>
        </div>
        
        {/* 작업 버튼 영역 */}
        <div className="flex justify-end space-x-2 mt-4 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            className="flex items-center"
          >
            <FilePen className="h-4 w-4 mr-1" />
            수정
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteAlert(true)}
            className="flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        </div>
        
        <Separator className="mt-2 mb-4" />
      </div>
      
      {/* 삭제 확인 모달 */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>식단 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 식단을 삭제하시겠습니까?<br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-gray-200 shadow-sm hover:bg-gray-100">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteAlert(false);
                onDelete();
              }}
              className="bg-red-600 text-white shadow-sm hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 