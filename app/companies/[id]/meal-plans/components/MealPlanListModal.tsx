import React from 'react';
import { format } from 'date-fns';
import { Edit, Eye, Trash2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { MealPlan } from '../types';
import { calculateMealPlanCost, formatCurrency, getMealTimeName, getMenuNames } from '../utils';

interface MealPlanListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  selectedMealTime: 'breakfast' | 'lunch' | 'dinner' | null;
  mealPlans: MealPlan[] | null;
  onView: (mealPlan: MealPlan) => void;
  onEdit: (mealPlan: MealPlan) => void;
  onDelete: (mealPlanId: string) => void;
}

const MealPlanListModal: React.FC<MealPlanListModalProps> = ({
  open,
  onOpenChange,
  selectedDate,
  selectedMealTime,
  mealPlans,
  onView,
  onEdit,
  onDelete
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Utensils className="h-5 w-5 mr-2 text-primary" />
            식단 목록 ({mealPlans?.length || 0}개)
          </DialogTitle>
          <DialogDescription>
            {selectedDate && selectedMealTime
              ? `${format(selectedDate, 'yyyy년 MM월 dd일')} ${getMealTimeName(selectedMealTime)} 식단`
              : '선택된 시간대의 식단 목록'}
          </DialogDescription>
        </DialogHeader>
        {mealPlans && mealPlans.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 py-4">
            {mealPlans.map(plan => (
              <Card 
                key={plan.id} 
                className="transition-all hover:shadow-md"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 mr-4 cursor-pointer" onClick={() => {onOpenChange(false); onView(plan);}}>
                    <p className="font-semibold text-sm mb-1 truncate">{plan.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {getMenuNames(plan)}
                    </p>
                    <p className="text-xs font-medium text-blue-600 mt-1">
                      {formatCurrency(calculateMealPlanCost(plan))}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {onOpenChange(false); onView(plan);}}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        onOpenChange(false);
                        onEdit(plan);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        onOpenChange(false);
                        onDelete(plan.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            해당 시간대에 등록된 식단이 없습니다.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MealPlanListModal; 