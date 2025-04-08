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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Trash2, 
  PackageOpen, 
  ArrowDownUp 
} from 'lucide-react';
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

interface SelectedIngredient {
  id?: string;
  menu_id?: string;
  ingredient: Ingredient;
  ingredient_id: string;
  amount: number;
}

interface MenuIngredientsSelectorProps {
  companyId: string;
  selectedIngredients: SelectedIngredient[];
  onChange: (ingredients: SelectedIngredient[]) => void;
}

export default function MenuIngredientsSelector({
  companyId,
  selectedIngredients,
  onChange
}: MenuIngredientsSelectorProps) {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [amount, setAmount] = useState<number>(1);

  // 식재료 목록 로드
  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/ingredients`);
        
        if (!response.ok) {
          throw new Error('식재료 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setIngredients(data);
      } catch (error) {
        console.error('식재료 로드 오류:', error);
        toast({
          title: '오류 발생',
          description: error instanceof Error ? error.message : '식재료 목록을 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchIngredients();
  }, [companyId, toast]);

  // 식재료 추가
  const handleAddIngredient = () => {
    if (!selectedIngredientId || amount <= 0) {
      toast({
        title: '입력 오류',
        description: '식재료를 선택하고 유효한 양을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 이미 추가된 식재료인지 확인
    const alreadyExists = selectedIngredients.some(item => 
      item.ingredient_id === selectedIngredientId
    );

    if (alreadyExists) {
      toast({
        title: '중복 식재료',
        description: '이미 추가된 식재료입니다. 해당 항목의 양을 수정해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 선택한 식재료 찾기
    const selectedIngredient = ingredients.find(i => i.id === selectedIngredientId);
    
    if (!selectedIngredient) {
      toast({
        title: '식재료 오류',
        description: '선택한 식재료를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    // 새 항목 추가
    const newItem: SelectedIngredient = {
      ingredient_id: selectedIngredient.id,
      ingredient: selectedIngredient,
      amount: amount
    };

    onChange([...selectedIngredients, newItem]);
    
    // 입력 필드 초기화
    setSelectedIngredientId('');
    setAmount(1);
  };

  // 식재료 양 변경
  const handleAmountChange = (index: number, newAmount: number) => {
    if (newAmount <= 0) return;
    
    const updatedIngredients = [...selectedIngredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      amount: newAmount
    };
    
    onChange(updatedIngredients);
  };

  // 식재료 삭제
  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = [...selectedIngredients];
    updatedIngredients.splice(index, 1);
    onChange(updatedIngredients);
  };

  // 사용 가능한 식재료 목록 (이미 선택된 식재료 제외)
  const availableIngredients = ingredients.filter(ingredient => 
    !selectedIngredients.some(item => item.ingredient_id === ingredient.id)
  );

  // 양 포맷팅
  const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
      return amount.toString();
    }
    return amount.toFixed(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ingredient-select">식재료 추가</Label>
        <div className="flex gap-3">
          <Select
            value={selectedIngredientId}
            onValueChange={setSelectedIngredientId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="식재료 선택" />
            </SelectTrigger>
            <SelectContent>
              {availableIngredients.length === 0 ? (
                <SelectItem value="none" disabled>
                  추가 가능한 식재료가 없습니다
                </SelectItem>
              ) : (
                availableIngredients.map((ingredient) => (
                  <SelectItem key={ingredient.id} value={ingredient.id}>
                    {ingredient.name} ({ingredient.package_amount} {ingredient.unit})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <div className="flex w-40 items-center">
            <Input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0.1"
              step="0.1"
              className="max-w-20"
            />
            <span className="ml-2 text-xs text-gray-500">단위</span>
          </div>
          
          <Button 
            type="button"
            onClick={handleAddIngredient}
            disabled={isLoading || !selectedIngredientId || amount <= 0}
            className="min-w-20"
          >
            <Plus className="h-4 w-4 mr-1" /> 추가
          </Button>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">선택된 식재료</h4>
        {selectedIngredients.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center border rounded-md">
            선택된 식재료가 없습니다
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>식재료</TableHead>
                <TableHead>양</TableHead>
                <TableHead>단가</TableHead>
                <TableHead>금액</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedIngredients.map((item, index) => {
                // 단위당 가격 계산 (package_amount 당 price의 비율)
                const unitPrice = item.ingredient.price / item.ingredient.package_amount;
                // 사용량에 따른 금액 계산
                const totalPrice = unitPrice * item.amount;
                
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                          min="0.1"
                          step="0.1"
                          className="w-20 h-8"
                        />
                        <span className="ml-2 text-xs">{item.ingredient.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatAmount(item.ingredient.package_amount)} {item.ingredient.unit} / {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(item.ingredient.price)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(totalPrice)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveIngredient(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
} 