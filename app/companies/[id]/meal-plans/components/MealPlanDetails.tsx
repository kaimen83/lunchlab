'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { FilePen, Trash2, Package, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
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
  
  // 컴포넌트 마운트 시 모든 메뉴의 칼로리 정보를 한 번에 로드
  useEffect(() => {
    const loadAllMenuDetails = async () => {
      if (!mealPlan.meal_plan_menus || mealPlan.meal_plan_menus.length === 0) {
        setIsLoadingCalories(false);
        return;
      }

      setIsLoadingCalories(true);
      
      try {
        // 배치 API를 사용하는 대신 순차적으로 처리
        const loadedDetails = await loadMenuDetailsSequentially();
        
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
    
    // 메뉴 상세 정보를 순차적으로 로드하는 함수
    const loadMenuDetailsSequentially = async () => {
      const detailsMap: Record<string, MenuDetailsResponse> = {};
      const companyId = mealPlan.company_id;
      
      for (const item of mealPlan.meal_plan_menus) {
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
            detailsMap[cacheKey] = data;
          } else {
            console.warn(`메뉴 ${item.menu_id} 상세 정보 로드 실패:`, await response.text());
          }
        } catch (error) {
          console.error(`메뉴 ${item.menu_id} 상세 정보 로드 오류:`, error);
        }
      }
      
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
    
    return mealPlan.meal_plan_menus.reduce((totalCost, item) => {
      const cacheKey = `${item.menu_id}-${item.container_id}`;
      
      // 캐시된 상세 정보가 있으면 사용
      if (menuDetails[cacheKey]) {
        return totalCost + menuDetails[cacheKey].cost;
      }
      
      // 캐시된 정보가 없으면 기존 방식대로 계산
      let itemCost = 0;
      
      // 용기 ID 확인
      const containerId = item.container_id;
      
      if (containerId && item.menu.menu_containers) {
        // 현재 메뉴와 용기에 해당하는 원가 정보 찾기
        const menuContainer = item.menu.menu_containers.find(
          mc => mc.menu_id === item.menu_id && mc.container_id === containerId
        );
        
        if (menuContainer) {
          // 특정 메뉴-용기 조합에 대한 원가 사용
          itemCost = menuContainer.ingredients_cost || 0;
        } else if (item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
          // 가격 이력에서 가져옴
          const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
            if (!a.recorded_at || !b.recorded_at) return 0;
            return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
          });
          itemCost = sortedHistory[0].cost_price || 0;
        }
      } else if (item.menu.menu_price_history && item.menu.menu_price_history.length > 0) {
        // 가격 이력에서 가져옴
        const sortedHistory = [...item.menu.menu_price_history].sort((a, b) => {
          if (!a.recorded_at || !b.recorded_at) return 0;
          return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
        });
        itemCost = sortedHistory[0].cost_price || 0;
      }
      
      return totalCost + itemCost;
    }, 0);
  };
  
  // 총 칼로리 계산 함수 - 캐시된 값 사용
  const calculateTotalCalories = () => {
    return totalCalories;
  };
  
  return (
    <div className="space-y-4">
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
                      className="h-8 w-8 p-0"
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
        <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
          <FilePen className="h-4 w-4" />
          수정
        </Button>
        <Button variant="destructive" size="sm" className="gap-1" onClick={() => setShowDeleteAlert(true)}>
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
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteAlert(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 