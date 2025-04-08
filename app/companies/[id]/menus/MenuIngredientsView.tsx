'use client';

import { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

interface MenuIngredient {
  id: string;
  menu_id: string;
  ingredient_id: string;
  amount: number;
  ingredient: Ingredient;
}

interface MenuIngredientsViewProps {
  companyId: string;
  menuId: string;
}

export default function MenuIngredientsView({ companyId, menuId }: MenuIngredientsViewProps) {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<MenuIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/menus/${menuId}/ingredients`);
        
        if (!response.ok) {
          throw new Error('메뉴 식재료 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setIngredients(data);
        
        // 총 원가 계산
        const cost = data.reduce((total: number, item: MenuIngredient) => {
          const unitPrice = item.ingredient.price / item.ingredient.package_amount;
          return total + (unitPrice * item.amount);
        }, 0);
        
        setTotalCost(cost);
      } catch (error) {
        console.error('메뉴 식재료 로드 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '메뉴 식재료를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchIngredients();
  }, [companyId, menuId, toast]);

  // 양 포맷팅
  const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
      return amount.toString();
    }
    return amount.toFixed(1);
  };

  // 금액 포맷팅
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : ingredients.length === 0 ? (
        <div className="text-center py-8">등록된 식재료가 없습니다.</div>
      ) : (
        <>
          <div className="border-b pb-2 mb-4">
            <div className="flex justify-between items-center">
              <div className="font-medium">총 원가:</div>
              <div className="text-lg font-bold">
                {formatCurrency(totalCost)}
              </div>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>식재료</TableHead>
                <TableHead>양</TableHead>
                <TableHead>단가</TableHead>
                <TableHead>비용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((item) => {
                // 단위당 가격 계산 (package_amount 당 price의 비율)
                const unitPrice = item.ingredient.price / item.ingredient.package_amount;
                // 사용량에 따른 금액 계산
                const itemCost = unitPrice * item.amount;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                    <TableCell>
                      {formatAmount(item.amount)} {item.ingredient.unit}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAmount(item.ingredient.package_amount)} {item.ingredient.unit} / {formatCurrency(item.ingredient.price)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(itemCost)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
} 