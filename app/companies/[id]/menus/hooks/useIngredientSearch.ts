'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getKoreanInitial } from '../utils/koreanUtils';
import { getRecentIngredients } from '../utils/localStorageUtils';

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

/**
 * 식재료 검색 및 관리를 위한 커스텀 훅
 */
export function useIngredientSearch(
  companyId: string,
  selectedIngredients: SelectedIngredient[]
) {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentIngredientIds, setRecentIngredientIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 식재료 목록 로드
  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/ingredients?limit=1000&detailed=true`);
        
        if (!response.ok) {
          throw new Error('식재료 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setIngredients(data.ingredients || []);
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
    
    // 로컬 스토리지에서 최근 사용 식재료 로드
    const recent = getRecentIngredients(companyId);
    setRecentIngredientIds(recent);
  }, [companyId, toast]);

  // 사용 가능한 식재료 목록 (이미 선택된 식재료 제외)
  const availableIngredients = useMemo(() => {
    return ingredients
      .filter(ingredient => 
        !selectedIngredients.some(item => item.ingredient_id === ingredient.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [ingredients, selectedIngredients]);
  
  // 최근 사용 식재료 목록
  const recentIngredients = useMemo(() => {
    return recentIngredientIds
      .map(id => availableIngredients.find(ing => ing.id === id))
      .filter(Boolean) as Ingredient[];
  }, [availableIngredients, recentIngredientIds]);
  
  // 검색 및 그룹화된 식재료 목록
  const filteredAndGroupedIngredients = useMemo(() => {
    // 검색어 필터링
    const filtered = searchQuery
      ? availableIngredients.filter(ing => 
          ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ing.unit.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : availableIngredients;
    
    // 그룹화
    const groups: Record<string, Ingredient[]> = {};
    
    filtered.forEach(ing => {
      // 검색 중일 때는 그룹화하지 않음
      if (searchQuery) {
        const key = '검색 결과';
        groups[key] = [...(groups[key] || []), ing];
        return;
      }
      
      const initial = getKoreanInitial(ing.name);
      groups[initial] = [...(groups[initial] || []), ing];
    });
    
    // 그룹 정렬
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  }, [availableIngredients, searchQuery]);

  // 포커스된 아이템 계산
  const flattenedItems = useMemo(() => {
    const items: { id: string; idx: number }[] = [];
    
    // 모든 아이템을 단순 배열로 펼침
    if (!searchQuery && recentIngredients.length > 0) {
      // 최근 사용 식재료
      recentIngredients.forEach(ingredient => {
        items.push({ id: ingredient.id, idx: items.length });
      });
    }
    
    // 일반 그룹화된 식재료
    filteredAndGroupedIngredients.forEach(([_, groupItems]) => {
      groupItems.forEach(ingredient => {
        items.push({ id: ingredient.id, idx: items.length });
      });
    });
    
    return items;
  }, [filteredAndGroupedIngredients, recentIngredients, searchQuery]);

  // 검색어 변경 핸들러
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFocusedItemIndex(-1);
  };

  // 포커스 초기화
  const resetFocus = () => {
    setFocusedItemIndex(-1);
    setFocusedGroupIndex(0);
    setSearchQuery('');
  };

  return {
    ingredients,
    isLoading,
    searchQuery,
    recentIngredientIds,
    setRecentIngredientIds,
    availableIngredients,
    recentIngredients,
    filteredAndGroupedIngredients,
    flattenedItems,
    focusedItemIndex,
    setFocusedItemIndex,
    focusedGroupIndex,
    setFocusedGroupIndex,
    searchInputRef,
    handleSearchChange,
    resetFocus
  };
} 