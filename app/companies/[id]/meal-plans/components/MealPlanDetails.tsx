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
import { FilePen, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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

interface MealPlanDetailsProps {
  mealPlan: MealPlan;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MealPlanDetails({ mealPlan, onEdit, onDelete }: MealPlanDetailsProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState<boolean>(false);
  
  // 식사 시간대 한글 이름
  const getMealTimeName = (mealTime: 'breakfast' | 'lunch' | 'dinner') => {
    switch (mealTime) {
      case 'breakfast':
        return '아침';
      case 'lunch':
        return '점심';
      case 'dinner':
        return '저녁';
      default:
        return mealTime;
    }
  };
  
  // 총 비용 계산
  const calculateTotalCost = () => {
    return mealPlan.meal_plan_menus.reduce((sum, item) => sum + (item.menu?.cost_price || 0), 0);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{mealPlan.name}</h3>
        <Badge variant="outline">{getMealTimeName(mealPlan.meal_time)}</Badge>
      </div>
      
      <div className="text-sm text-gray-500">
        <p>날짜: {format(new Date(mealPlan.date), 'yyyy년 MM월 dd일')}</p>
        <p>등록일: {format(new Date(mealPlan.created_at), 'yyyy년 MM월 dd일 HH:mm')}</p>
        {mealPlan.updated_at && mealPlan.updated_at !== mealPlan.created_at && (
          <p>수정일: {format(new Date(mealPlan.updated_at), 'yyyy년 MM월 dd일 HH:mm')}</p>
        )}
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-medium mb-2">포함 메뉴 ({mealPlan.meal_plan_menus.length}개)</h4>
        {mealPlan.meal_plan_menus.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 메뉴가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {mealPlan.meal_plan_menus.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.menu.name}</span>
                  {item.menu.description && (
                    <p className="text-xs text-gray-500">{item.menu.description}</p>
                  )}
                </div>
                <span className="text-gray-500">
                  {new Intl.NumberFormat('ko-KR').format(item.menu.cost_price)}원
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <div className="font-medium">
          총 비용: {new Intl.NumberFormat('ko-KR').format(calculateTotalCost())}원
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