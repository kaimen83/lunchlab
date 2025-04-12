'use client';

import { useState } from 'react';
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
import { FilePen, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { MealPlan } from '../types';
import { getMealTimeName, calculateMealPlanCost, formatCurrency } from '../utils';

interface MealPlanDetailsProps {
  mealPlan: MealPlan;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MealPlanDetails({ mealPlan, onEdit, onDelete }: MealPlanDetailsProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  
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
              // 메뉴와 용기 비용 계산
              const menuCost = item.menu.menu_price_history && item.menu.menu_price_history.length > 0 
                ? item.menu.menu_price_history[0].cost_price || 0 
                : 0;
              const containerCost = item.container?.price || 0;
              const totalCost = menuCost + containerCost;
              
              return (
                <li key={item.id} className="border-b pb-2 last:border-0 last:pb-0">
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
                    
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(totalCost)}</div>
                      {item.container && (
                        <div className="text-xs text-muted-foreground">
                          메뉴: {formatCurrency(menuCost)}<br />
                          용기: {formatCurrency(containerCost)}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="font-medium text-lg">
          총 비용: {formatCurrency(calculateMealPlanCost(mealPlan))}
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