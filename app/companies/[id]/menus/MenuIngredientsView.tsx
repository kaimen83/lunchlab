'use client';

import { useState, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

interface Container {
  id: string;
  container: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
  };
  ingredients: {
    id: string;
    ingredient_id: string;
    amount: number;
    ingredient: Ingredient;
  }[];
  ingredients_cost: number;
  total_cost: number;
}

interface MenuIngredientsViewProps {
  companyId: string;
  menuId: string;
}

export default function MenuIngredientsView({ companyId, menuId }: MenuIngredientsViewProps) {
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 메뉴 용기 및 용기별 식재료 조회
        const containersResponse = await fetch(`/api/companies/${companyId}/menus/${menuId}/containers`);
        
        if (!containersResponse.ok) {
          throw new Error('메뉴 용기 정보를 불러오는데 실패했습니다.');
        }
        
        const containersData = await containersResponse.json();
        setContainers(containersData);
      } catch (error) {
        console.error('메뉴 데이터 로드 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '메뉴 정보를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

  // 용기별 식재료 테이블 렌더링
  const renderContainerIngredients = (container: Container) => {
    return (
      <Card key={container.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Package className="h-4 w-4 mr-2" />
              {container.container.name}
            </CardTitle>
            <div className="font-bold text-blue-700">
              {formatCurrency(container.ingredients_cost)}
            </div>
          </div>
          {container.container.description && (
            <CardDescription>{container.container.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-2 rounded text-sm mb-4">
            <span className="font-semibold">식재료 총 비용:</span> {formatCurrency(container.ingredients_cost)}
          </div>
          
          {container.ingredients.length > 0 ? (
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
                {container.ingredients.map((item) => {
                  const unitPrice = item.ingredient.price / item.ingredient.package_amount;
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
          ) : (
            <div className="text-center py-4 text-gray-500">이 용기에 등록된 식재료가 없습니다.</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : (
        <>
          {containers.length > 0 ? (
            <div className="space-y-4">
              {containers.map(container => renderContainerIngredients(container))}
            </div>
          ) : (
            <div className="text-center py-8">등록된 용기 정보가 없습니다.</div>
          )}
        </>
      )}
    </div>
  );
} 