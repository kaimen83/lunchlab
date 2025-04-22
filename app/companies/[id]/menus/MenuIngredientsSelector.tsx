'use client';

import { useState, useEffect, useMemo, useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
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
  Search,
  Clock,
  ListFilter,
  CheckCircle2,
  Sparkles,
  Tag,
  CircleSlash,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

// 한글 초성 추출 유틸리티 함수
const getKoreanInitial = (text: string): string => {
  const firstChar = text.charAt(0);
  const unicodeValue = firstChar.charCodeAt(0);
  
  // 한글 범위 확인 (유니코드: AC00-D7A3)
  if (unicodeValue >= 44032 && unicodeValue <= 55203) {
    const idx = Math.floor((unicodeValue - 44032) / 588);
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return initials[idx] || firstChar;
  }
  
  // 영문자인 경우
  if (/[a-zA-Z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  
  // 숫자나 기타 문자인 경우
  return /[0-9]/.test(firstChar) ? '#' : '기타';
};

// 로컬 스토리지에서 최근 사용 식재료 관리
const getRecentIngredients = (companyId: string): string[] => {
  if (typeof window === 'undefined') return [];
  
  const key = `recent-ingredients-${companyId}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

const addRecentIngredient = (companyId: string, ingredientId: string) => {
  if (typeof window === 'undefined') return;
  
  const key = `recent-ingredients-${companyId}`;
  const recent = getRecentIngredients(companyId);
  
  // 이미 있으면 제거 후 맨 앞에 추가
  const filtered = recent.filter(id => id !== ingredientId);
  filtered.unshift(ingredientId);
  
  // 최대 5개만 유지
  const updated = filtered.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(updated));
};

export default function MenuIngredientsSelector({
  companyId,
  selectedIngredients,
  onChange,
  amountEditable = true
}: MenuIngredientsSelectorProps) {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState<number>(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recentIngredientIds, setRecentIngredientIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // 키보드 탐색을 위한 상태 추가
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLDivElement>(null);

  // 식재료 목록 로드
  useEffect(() => {
    const fetchIngredients = async () => {
      setIsLoading(true);
      try {
        // limit 파라미터를 1000으로 설정하고 detailed 파라미터를 true로 설정하여 모든 식재료를 가져옵니다.
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

  // 포커스된 아이템 계산 - 완전히 새로운 접근 방식
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

  // 리스트 아이템 키보드 이벤트 처리 - 완전히 수정
  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
    if (flattenedItems.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (focusedItemIndex < flattenedItems.length - 1) {
          // 다음 아이템으로 이동
          setFocusedItemIndex(focusedItemIndex + 1);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (focusedItemIndex > 0) {
          // 이전 아이템으로 이동
          setFocusedItemIndex(focusedItemIndex - 1);
        } else {
          // 첫 번째 아이템에서 위로 이동 시 검색창으로 포커스 이동
          setFocusedItemIndex(-1);
          searchInputRef.current?.focus();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (focusedItemIndex >= 0 && focusedItemIndex < flattenedItems.length) {
          // 선택한 아이템의 ID로 선택 처리
          const selected = flattenedItems[focusedItemIndex];
          handleIngredientSelect(selected.id);
        }
        break;
        
      case 'Tab':
        if (e.shiftKey) {
          e.preventDefault();
          setFocusedItemIndex(-1);
          searchInputRef.current?.focus();
        }
        break;
        
      case 'Escape':
        setSheetOpen(false);
        break;
    }
  };

  // 글로벌 키보드 이벤트 리스너 설정 - 수정
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!sheetOpen) return;
      
      // 다른 요소가 포커스 중일 때는 이벤트 무시
      const activeElement = document.activeElement;
      if (activeElement === searchInputRef.current) return;
      
      // 필요한 키 처리
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault();
        
        // Enter 키를 눌렀을 때 직접 handleIngredientSelect 호출
        if (e.key === 'Enter' && focusedItemIndex >= 0 && focusedItemIndex < flattenedItems.length) {
          const selected = flattenedItems[focusedItemIndex];
          handleIngredientSelect(selected.id);
          return;
        }
        
        // 다른 키는 handleListKeyDown으로 위임
        handleListKeyDown(e);
      }
    };
    
    if (sheetOpen) {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [sheetOpen, focusedItemIndex, flattenedItems]);

  // 시트 닫힐 때 포커스 초기화
  useEffect(() => {
    if (!sheetOpen) {
      setFocusedItemIndex(-1);
      setFocusedGroupIndex(0);
    } else {
      // 시트가 열렸을 때 검색 필드에 포커스
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [sheetOpen]);

  // 포커스된 아이템이 변경될 때 스크롤 처리
  useEffect(() => {
    if (focusedItemIndex >= 0 && focusedItemRef.current) {
      focusedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [focusedItemIndex]);

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
      setSearchQuery(''); // 검색어 초기화
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
      setSearchQuery(''); // 검색어 초기화
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
    setSearchQuery(''); // 검색어 초기화
  };

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
      setSearchQuery('');
      setFocusedItemIndex(-1);
      setFocusedGroupIndex(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ingredient-select" className="text-sm font-medium text-gray-700">식재료 추가</Label>
        <div className="flex gap-3">
          <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200"
                type="button"
                disabled={isLoading || availableIngredients.length === 0}
              >
                <Search className="h-4 w-4 mr-2 text-blue-500" />
                식재료 검색
              </Button>
            </SheetTrigger>
            <SheetContent 
              className="w-full max-h-[92vh] p-0 rounded-t-2xl border-t-0 bg-gradient-to-b from-gray-50 to-white md:max-w-2xl md:mx-auto md:rounded-2xl md:border md:h-auto md:max-h-[600px] md:top-[50%] md:translate-y-[-50%] md:bottom-auto" 
              side="bottom" 
              closeButton={false}
            >
              <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/90 border-b border-gray-100 rounded-t-2xl">
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                <SheetHeader className="px-6 pt-2 pb-4">
                  <SheetTitle className="text-xl font-bold text-gray-800">식재료 선택</SheetTitle>
                  <SheetDescription className="text-gray-500">
                    추가할 식재료를 검색하거나 목록에서 선택하세요. 식재료를 클릭하면 바로 추가됩니다.
                    <p className="text-xs text-blue-500 mt-1">Tab 키로 리스트로 이동 후 화살표 키와 Enter 키로 선택할 수 있습니다.</p>
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="식재료 이름 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleListKeyDown}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 placeholder:text-gray-400 border-none"
                    />
                    {searchQuery && (
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-500 hover:text-gray-700"
                          onClick={() => setSearchQuery('')}
                        >
                          <CircleSlash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-4 pb-6">
                <div className="rounded-xl overflow-hidden">
                  <div 
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto py-2 md:max-h-[400px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50 rounded-md"
                    onKeyDown={handleListKeyDown}
                    tabIndex={0}
                    role="listbox"
                    aria-labelledby="ingredients-list"
                  >
                    {flattenedItems.length === 0 && (
                      <div className="py-6 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <CircleSlash className="h-8 w-8 text-gray-300" />
                          <p>검색 결과가 없습니다</p>
                        </div>
                      </div>
                    )}
                    
                    {recentIngredients.length > 0 && !searchQuery && (
                      <>
                        <div className="pb-1">
                          <div className="text-sm font-medium px-3 py-1 text-gray-500">최근 사용</div>
                          <div className="py-1 px-1 space-y-1">
                            {recentIngredients.map((ingredient, idx) => {
                              // 이 아이템의 전체 인덱스 계산
                              const currentIdx = flattenedItems.findIndex(item => item.id === ingredient.id);
                              const isFocused = currentIdx === focusedItemIndex;
                              
                              return (
                                <div
                                  key={ingredient.id}
                                  ref={isFocused ? focusedItemRef : null}
                                  onClick={() => handleIngredientSelect(ingredient.id)}
                                  className={cn(
                                    "flex items-center px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer",
                                    isFocused ? "bg-blue-100 ring-2 ring-blue-500 ring-opacity-50" : ""
                                  )}
                                  role="option"
                                  aria-selected={isFocused}
                                  data-focused={isFocused ? "true" : undefined}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                    <div className="flex-1 truncate">
                                      <span className="font-medium">{ingredient.name}</span>
                                      <Badge variant="outline" className="ml-2 bg-gray-50 text-xs font-normal">
                                        {ingredient.package_amount} {ingredient.unit}
                                      </Badge>
                                    </div>
                                  </div>
                                  <CheckCircle2 className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    isFocused ? "opacity-100 text-blue-500" : "opacity-0"
                                  )} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="my-1 h-px bg-gray-100" />
                      </>
                    )}
                    
                    <div className="py-2">
                      {filteredAndGroupedIngredients.map(([group, items], groupIdx) => (
                        <div key={group} className="pb-1">
                          <div className="text-sm font-medium px-3 py-1 text-gray-500">{group}</div>
                          <div className="py-1 px-1 space-y-1">
                            {items.map((ingredient, itemIdx) => {
                              // 이 아이템의 전체 인덱스 계산
                              const currentIdx = flattenedItems.findIndex(item => item.id === ingredient.id);
                              const isFocused = currentIdx === focusedItemIndex;
                              
                              return (
                                <div
                                  key={ingredient.id}
                                  ref={isFocused ? focusedItemRef : null}
                                  onClick={() => handleIngredientSelect(ingredient.id)}
                                  className={cn(
                                    "flex items-center px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer",
                                    isFocused ? "bg-blue-100 ring-2 ring-blue-500 ring-opacity-50" : ""
                                  )}
                                  role="option"
                                  aria-selected={isFocused}
                                  data-focused={isFocused ? "true" : undefined}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Tag className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <div className="flex-1 truncate">
                                      <span className="font-medium">{ingredient.name}</span>
                                      <Badge variant="outline" className="ml-2 bg-gray-50 text-xs font-normal">
                                        {ingredient.package_amount} {ingredient.unit}
                                      </Badge>
                                    </div>
                                  </div>
                                  <CheckCircle2 className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    isFocused ? "opacity-100 text-blue-500" : "opacity-0"
                                  )} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <SheetFooter className="px-6 py-4 border-t border-gray-100 bg-white">
                <Button 
                  onClick={() => setSheetOpen(false)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-md py-3"
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  닫기
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
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

      {selectedIngredients.length > 0 ? (
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
                            handleAmountChange(index, parseFloat(e.target.value) || 0)
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
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-6 px-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center gap-2">
          <Sparkles className="h-6 w-6 text-gray-400" />
          <p>추가된 식재료가 없습니다. 위에서 식재료를 선택해 추가해주세요.</p>
        </div>
      )}
    </div>
  );
} 