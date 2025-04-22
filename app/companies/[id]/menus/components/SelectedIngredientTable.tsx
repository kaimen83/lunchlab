'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { PackageOpen, Trash2, Sparkles } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

interface SelectedIngredient {
  id?: string;
  menu_id?: string;
  ingredient: Ingredient;
  ingredient_id: string;
  amount: number;
}

interface SelectedIngredientTableProps {
  selectedIngredients: SelectedIngredient[];
  amountEditable: boolean;
  onAmountChange: (index: number, newAmount: number) => void;
  onRemoveIngredient: (index: number) => void;
  formatAmount: (amount: number) => string;
}

/**
 * 메뉴에 선택된 식재료 목록을 테이블로 표시하는 컴포넌트
 */
export function SelectedIngredientTable({
  selectedIngredients,
  amountEditable,
  onAmountChange,
  onRemoveIngredient,
  formatAmount
}: SelectedIngredientTableProps) {
  if (selectedIngredients.length === 0) {
    return (
      <div className="text-center py-6 px-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center gap-2">
        <Sparkles className="h-6 w-6 text-gray-400" />
        <p>추가된 식재료가 없습니다. 위에서 식재료를 선택해 추가해주세요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="font-medium">식재료명</TableHead>
            <TableHead className="font-medium">패키지</TableHead>
            {amountEditable && <TableHead className="text-right font-medium">사용량</TableHead>}
            <TableHead className="text-right font-medium">단가</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedIngredients.map((item, index) => (
            <TableRow key={index} className="hover:bg-gray-50 transition-colors duration-150">
              <TableCell className="font-medium">{item.ingredient.name}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  <PackageOpen className="h-4 w-4 mr-1 text-blue-500" />
                  <span>
                    {item.ingredient.package_amount} {item.ingredient.unit}
                  </span>
                </div>
              </TableCell>
              {amountEditable && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      className="w-16 text-right focus:ring-blue-500 focus:border-blue-500"
                      value={formatAmount(item.amount)}
                      onChange={(e) => 
                        onAmountChange(index, parseFloat(e.target.value) || 0)
                      }
                    />
                    <span className="text-sm w-8 text-gray-600">
                      {item.ingredient.unit}
                    </span>
                  </div>
                </TableCell>
              )}
              <TableCell className="text-right font-medium">
                {new Intl.NumberFormat('ko-KR', { 
                  style: 'currency', 
                  currency: 'KRW' 
                }).format(item.ingredient.price)}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 hover:bg-red-50 transition-colors duration-150"
                  onClick={() => onRemoveIngredient(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 