'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';

// 유틸리티 함수 및 커스텀 훅 가져오기
import { addRecentIngredient, getRecentIngredients } from './utils/localStorageUtils';
import { useIngredientSearch } from './hooks/useIngredientSearch';
import { useIngredientKeyboardNavigation } from './hooks/useIngredientKeyboardNavigation';

// 컴포넌트 가져오기
import { IngredientSearchSheet } from './components/IngredientSearchSheet';
import { SelectedIngredientTable } from './components/SelectedIngredientTable';

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
  amountEditable?: boolean;
}

/**
 * 메뉴 식재료 선택 컴포넌트
 * 식재료 검색, 선택, 수량 조정 기능 제공
 */
export default function MenuIngredientsSelector({
  companyId,
  selectedIngredients,
  onChange,
  amountEditable = true
}: MenuIngredientsSelectorProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const focusedItemRef = useRef<HTMLDivElement>(null);
  
  // 식재료 검색 훅 사용
  const {
    ingredients,
    isLoading,
    searchQuery,
    recentIngredientIds,
    setRecentIngredientIds,
    availableIngredients,
    recentIngredients,
    filteredAndGroupedIngredients,
    flattenedItems,
    searchInputRef,
    handleSearchChange,
    resetFocus
  } = useIngredientSearch(companyId, selectedIngredients);
  
  // 식재료 선택 후 바로 추가
  const handleIngredientSelect = (id: string) => {
    // 이미 추가된 식재료인지 확인
    const alreadyExists = selectedIngredients.some(item => 
      item.ingredient_id === id
    );

    if (alreadyExists) {
      toast({
        title: '중복 식재료',
        description: '이미 추가된 식재료입니다. 해당 항목의 양을 수정해주세요.',
        variant: 'destructive',
      });
      setSheetOpen(false);
      resetFocus();
      return;
    }

    // 선택한 식재료 찾기
    const selectedIngredient = ingredients.find(i => i.id === id);
    
    if (!selectedIngredient) {
      toast({
        title: '식재료 오류',
        description: '선택한 식재료를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      setSheetOpen(false);
      resetFocus();
      return;
    }

    // 최근 사용 식재료에 추가
    addRecentIngredient(companyId, id);
    setRecentIngredientIds(getRecentIngredients(companyId));

    // 새 항목 추가
    const newItem: SelectedIngredient = {
      ingredient_id: id,
      ingredient: selectedIngredient,
      amount: amount
    };

    onChange([...selectedIngredients, newItem]);
    
    // 입력 필드 초기화
    setAmount(1);
    setSheetOpen(false);
    resetFocus();
  };
  
  // 키보드 탐색 훅 사용
  const {
    focusedItemIndex,
    focusedGroupIndex,
    handleListKeyDown
  } = useIngredientKeyboardNavigation(
    flattenedItems,
    sheetOpen,
    searchInputRef,
    handleIngredientSelect,
    setSheetOpen
  );
  
  // 포커스된 요소를 보여주기 위한 함수
  const scrollToFocusedItem = () => {
    // 포커스된 요소 찾기
    const focusedElement = document.querySelector('[data-focused="true"]');
    
    if (focusedElement) {
      // 요소가 있는 경우 스크롤 처리
      focusedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };
  
  // 포커스된 아이템이 변경될 때 스크롤 처리
  useEffect(() => {
    if (focusedItemIndex >= 0 && sheetOpen) {
      // setTimeout으로 DOM 업데이트 후 스크롤 처리를 보장
      setTimeout(() => {
        scrollToFocusedItem();
      }, 10);
    }
  }, [focusedItemIndex, sheetOpen]);

  // 식재료 양 변경
  const handleAmountChange = (index: number, newAmount: number) => {
    if (newAmount <= 0) return;
    
    // 수량 편집이 비활성화된 경우 처리하지 않음
    if (!amountEditable) return;
    
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

  // 양 포맷팅
  const formatAmount = (amount: number) => {
    if (amount % 1 === 0) {
      return amount.toString();
    }
    return amount.toFixed(1);
  };

  // 시트 오픈 상태 변경 처리
  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    
    // 시트가 닫힐 때 검색어 초기화
    if (!open) {
      resetFocus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ingredient-select" className="text-sm font-medium text-gray-700">식재료 추가</Label>
        <div className="flex gap-3">
          <IngredientSearchSheet
            isOpen={sheetOpen}
            isLoading={isLoading}
            availableIngredients={availableIngredients}
            searchQuery={searchQuery}
            recentIngredients={recentIngredients}
            filteredAndGroupedIngredients={filteredAndGroupedIngredients}
            flattenedItems={flattenedItems}
            focusedItemIndex={focusedItemIndex}
            searchInputRef={searchInputRef}
            onOpenChange={handleSheetOpenChange}
            onSearchChange={handleSearchChange}
            onIngredientSelect={handleIngredientSelect}
            handleListKeyDown={handleListKeyDown}
          />
          
          {amountEditable && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                className="w-24 border-gray-200 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
              <span className="text-sm font-medium text-gray-600">
                단위
              </span>
            </div>
          )}
        </div>
      </div>

      <SelectedIngredientTable
        selectedIngredients={selectedIngredients}
        amountEditable={amountEditable}
        onAmountChange={handleAmountChange}
        onRemoveIngredient={handleRemoveIngredient}
        formatAmount={formatAmount}
      />
    </div>
  );
} 