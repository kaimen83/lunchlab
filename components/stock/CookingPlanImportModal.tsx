'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileText, Loader2, ShoppingCart, Search, CheckCircle2, AlertCircle, Plus, X, Tag, Package, Clock, Users, ChefHat } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// 재고 요구사항 타입 정의
interface StockRequirement {
  id: string;
  name: string;
  item_type: 'ingredient' | 'container';
  total_amount: number;
  unit: string;
  code_name?: string;
  supplier?: string;
  stock_grade?: string;
  price?: number;
}

interface CookingPlanData {
  date: string;
  ingredients: StockRequirement[];
  containers: StockRequirement[];
  message?: string;
}

interface CookingPlanImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onImportComplete: () => void;
}

export function CookingPlanImportModal({
  open,
  onOpenChange,
  companyId,
  onImportComplete,
}: CookingPlanImportModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cookingPlanData, setCookingPlanData] = useState<CookingPlanData | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // 수정된 수량 관리 (항상 활성화)
  const [editedQuantities, setEditedQuantities] = useState<Map<string, number>>(new Map());

  // 인라인 캘린더 표시 상태
  const [showCalendar, setShowCalendar] = useState(false);

  // 항목 추가 관련 상태
  const [additionalItems, setAdditionalItems] = useState<StockRequirement[]>([]);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [addItemType, setAddItemType] = useState<'ingredient' | 'container'>('ingredient');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchItems, setSelectedSearchItems] = useState<any[]>([]);
  const [addItemQuantity, setAddItemQuantity] = useState<number>(1);

  // 컴포넌트 마운트 상태 추적을 위한 ref
  const isMountedRef = useRef(true);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setCookingPlanData(null);
          setSelectedItems(new Set());
          setSelectedDate(undefined);
          setIsLoading(false);
          setIsProcessing(false);
          setEditedQuantities(new Map());
          setShowCalendar(false);
          // 항목 추가 관련 상태 초기화
          setAdditionalItems([]);
          setShowAddItemForm(false);
          setSearchQuery('');
          setSearchResults([]);
          setSelectedSearchItems([]);
          setAddItemQuantity(1);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // 안전한 상태 업데이트 함수
  const safeSetState = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      try {
        updateFn();
      } catch (error) {
        console.warn('Safe state update warning:', error);
      }
    }
  }, []);

  // 숫자 포맷 함수 (천단위 구분자)
  const formatNumber = (value: number) => {
    return value.toLocaleString('ko-KR');
  };

  // 수량 변경 핸들러
  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    if (numericValue >= 0) {
      safeSetState(() => {
        const newQuantities = new Map(editedQuantities);
        newQuantities.set(itemId, numericValue);
        setEditedQuantities(newQuantities);
      });
    }
  }, [editedQuantities, safeSetState]);

  // 실제 사용할 수량 가져오기 (수정된 수량이 있으면 수정된 수량, 없으면 원래 수량)
  const getActualQuantity = useCallback((item: StockRequirement) => {
    return editedQuantities.get(item.id) ?? item.total_amount;
  }, [editedQuantities]);

  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false); // 날짜 선택 시 캘린더 닫기
  }, []);

  // 항목 검색 함수
  const searchItems = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let endpoint = '';
      if (addItemType === 'ingredient') {
        endpoint = `/api/companies/${companyId}/ingredients?search=${encodeURIComponent(searchQuery)}&limit=20`;
      } else {
        endpoint = `/api/companies/${companyId}/stock/items?itemType=container&query=${encodeURIComponent(searchQuery)}&pageSize=20`;
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('검색에 실패했습니다');
      }

      const data = await response.json();
      
      if (addItemType === 'ingredient') {
        setSearchResults(data.ingredients || []);
      } else {
        setSearchResults(data.items?.filter((item: any) => item.item_type === 'container') || []);
      }
    } catch (error) {
      console.error('항목 검색 오류:', error);
      toast({
        title: '검색 실패',
        description: '항목을 검색하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // 항목 추가 함수
  const addItem = () => {
    if (selectedSearchItems.length === 0 || addItemQuantity <= 0) {
      toast({
        title: '입력 확인',
        description: '항목을 선택하고 올바른 수량을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const newItems: StockRequirement[] = selectedSearchItems.map(selectedItem => ({
      id: `temp_${addItemType}_${selectedItem.id}`,
      name: selectedItem.name,
      item_type: addItemType,
      total_amount: addItemQuantity,
      unit: selectedItem.unit || '개',
      code_name: selectedItem.code_name,
      supplier: selectedItem.supplier,
      stock_grade: selectedItem.stock_grade,
      price: selectedItem.price,
    }));

    setAdditionalItems(prev => [...prev, ...newItems]);
    
    // 폼 초기화
    setSelectedSearchItems([]);
    setAddItemQuantity(1);
    setSearchQuery('');
    setSearchResults([]);
    setShowAddItemForm(false);

    toast({
      title: '항목 추가됨',
      description: `${newItems.length}개 항목이 목록에 추가되었습니다.`,
    });
  };

  // 추가된 항목 제거 함수
  const removeAdditionalItem = (itemId: string) => {
    setAdditionalItems(prev => prev.filter(item => item.id !== itemId));
    // 선택된 항목에서도 제거
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // 조리계획서 조회
  const fetchCookingPlan = async () => {
    if (!selectedDate) {
      toast({
        title: '날짜를 선택해주세요',
        description: '조리계획서를 조회할 날짜를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    safeSetState(() => setIsLoading(true));
    
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/companies/${companyId}/cooking-plans/${dateString}/stock-requirements`
      );

      if (!response.ok) {
        throw new Error('조리계획서를 조회하는데 실패했습니다');
      }

      const result = await response.json();
      
      safeSetState(() => {
        setCookingPlanData(result.data);
        setSelectedItems(new Set()); // 선택 항목 초기화
        setEditedQuantities(new Map()); // 수정된 수량 초기화
        setAdditionalItems([]); // 추가된 항목 초기화
        setShowAddItemForm(false); // 항목 추가 폼 닫기
      });

      if (result.data.ingredients.length === 0 && result.data.containers.length === 0) {
        toast({
          title: '조리계획서가 없습니다',
          description: result.data.message || '해당 날짜의 조리계획서가 없습니다.',
        });
      } else {
        toast({
          title: '조리계획서를 불러왔습니다',
          description: `식재료 ${result.data.ingredients.length}개, 용기 ${result.data.containers.length}개 항목을 찾았습니다.`,
        });
      }
    } catch (error) {
      console.error('조리계획서 조회 오류:', error);
      toast({
        title: '조회 실패',
        description: '조리계획서를 조회하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  };

  // 항목 선택/해제
  const toggleItemSelection = useCallback((itemId: string) => {
    safeSetState(() => {
      const newSelection = new Set(selectedItems);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      setSelectedItems(newSelection);
    });
  }, [selectedItems, safeSetState]);

  // 전체 선택/해제
  const toggleAllSelection = useCallback(() => {
    if (!cookingPlanData && additionalItems.length === 0) return;

    safeSetState(() => {
      const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers, ...additionalItems] : additionalItems;
      const allItemIds = allItems.map(item => item.id);
      
      if (selectedItems.size === allItemIds.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(allItemIds));
      }
    });
  }, [cookingPlanData, additionalItems, selectedItems, safeSetState]);

  // 일괄 출고 처리 (수정된 수량 반영)
  const processBulkOutgoing = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: '항목을 선택해주세요',
        description: '출고할 항목을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers, ...additionalItems] : additionalItems;
    if (allItems.length === 0) return;

    safeSetState(() => setIsProcessing(true));
    
    try {
      const selectedItemsData = allItems.filter(item => selectedItems.has(item.id));

      // 선택된 항목들의 재고 항목 ID를 찾기
      const stockItemIds: string[] = [];
      const quantities: number[] = [];
      const failedItems: string[] = [];

      for (const item of selectedItemsData) {
        try {
          // 해당 항목의 재고 항목 ID를 찾기
          const stockItemResponse = await fetch(
            `/api/companies/${companyId}/stock/items?itemType=${item.item_type}&query=${encodeURIComponent(item.name)}&stockGrade=all`
          );
          
          if (!stockItemResponse.ok) {
            failedItems.push(`${item.name} (재고 정보 조회 실패)`);
            continue;
          }

          const stockData = await stockItemResponse.json();
          const stockItem = stockData.items.find((si: any) => 
            si.details?.name === item.name || si.name === item.name
          );

          if (!stockItem) {
            // 재고 항목이 없으면 임시 ID 생성
            // item.id가 이미 temp_ 형태인지 확인
            let tempId;
            if (item.id.startsWith('temp_')) {
              tempId = item.id; // 이미 temp_ 형태면 그대로 사용
            } else {
              tempId = `temp_${item.item_type}_${item.id}`;
            }
            stockItemIds.push(tempId);
            quantities.push(getActualQuantity(item));
            continue;
          }

          stockItemIds.push(stockItem.id);
          // 수정된 수량이 있으면 수정된 수량 사용, 없으면 원래 수량 사용
          quantities.push(getActualQuantity(item));
        } catch (error) {
          console.error(`${item.name} 처리 오류:`, error);
          failedItems.push(`${item.name} (처리 오류)`);
        }
      }

      if (stockItemIds.length === 0) {
        toast({
          title: '처리할 수 있는 항목이 없습니다',
          description: failedItems.length > 0 ? `실패한 항목: ${failedItems.join(', ')}` : '모든 항목 처리에 실패했습니다.',
          variant: 'destructive',
        });
        return;
      }

      // 일괄 출고 거래 생성
      const transactionResponse = await fetch(
        `/api/companies/${companyId}/stock/transactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stockItemIds,
            quantities,
            requestType: 'outgoing',
            notes: `조리계획서 기반 출고 (${cookingPlanData?.date || format(selectedDate!, 'yyyy-MM-dd')}) - 수량 수정됨`,
            directProcess: true, // 직접 처리 플래그
          }),
        }
      );

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.error || '일괄 출고 처리에 실패했습니다');
      }

      const successful = stockItemIds.length;
      const failed = failedItems.length;

      if (failed > 0) {
        toast({
          title: `일부 항목 처리 완료 (${successful}/${selectedItems.size})`,
          description: `실패한 항목: ${failedItems.join(', ')}`,
        });
      } else {
        toast({
          title: '일괄 출고 완료',
          description: `${successful}개 항목이 성공적으로 출고 처리되었습니다.`,
        });
      }

      // 성공한 경우 모달 닫기 및 새로고침
      if (successful > 0) {
        onImportComplete();
        setTimeout(() => {
          if (isMountedRef.current) {
            onOpenChange(false);
          }
        }, 100);
      }
    } catch (error) {
      console.error('일괄 출고 처리 오류:', error);
      toast({
        title: '출고 처리 실패',
        description: error instanceof Error ? error.message : '일괄 출고 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      safeSetState(() => setIsProcessing(false));
    }
  };

  const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers, ...additionalItems] : additionalItems;
  const isAllSelected = allItems.length > 0 && selectedItems.size === allItems.length;
  const today = new Date();

  // 이미 존재하는 항목인지 체크하는 함수
  const isItemAlreadyExists = useCallback((itemName: string) => {
    return allItems.some(item => item.name === itemName);
  }, [allItems]);

  // 검색 항목 선택/해제 핸들러
  const toggleSearchItemSelection = useCallback((item: any) => {
    if (isItemAlreadyExists(item.name)) return; // 이미 존재하는 항목은 선택 불가
    
    setSelectedSearchItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  }, [isItemAlreadyExists]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-primary rounded-lg">
              <ChefHat className="h-4 w-4 text-primary-foreground" />
            </div>
            조리계획서 불러오기
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            특정 날짜의 조리계획서에서 재고 등급이 있는 식재료와 용기를 불러와 필요수량을 조정한 후 일괄 출고 처리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* 날짜 선택 섹션 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4" />
                날짜 선택
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 날짜 선택 버튼 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={cn(
                    'w-[280px] justify-between text-left font-normal h-9',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="text-sm">
                      {selectedDate ? (
                        <span className="font-medium">
                          {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                        </span>
                      ) : (
                        '조리계획서 날짜를 선택하세요'
                      )}
                    </span>
                  </div>
                  <Clock className="h-4 w-4 opacity-50" />
                </Button>
                
                <Button
                  onClick={fetchCookingPlan}
                  disabled={!selectedDate || isLoading}
                  className="h-9 px-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      조회 중...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      조회
                    </>
                  )}
                </Button>
              </div>

              {/* 인라인 캘린더 */}
              {showCalendar && (
                <div className="border rounded-lg p-3 bg-card animate-in slide-in-from-top-2 duration-200">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={ko}
                    today={today}
                    className="rounded-md"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 조리계획서 데이터 표시 */}
          {cookingPlanData && (
            <>
              {allItems.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {format(new Date(cookingPlanData.date), 'yyyy년 MM월 dd일', { locale: ko })} 조리계획서
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            총 {allItems.length}개 항목 
                            {cookingPlanData && (
                              <>
                                (조리계획서: {cookingPlanData.ingredients.length + cookingPlanData.containers.length}개
                                {additionalItems.length > 0 && `, 추가: ${additionalItems.length}개`})
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={isAllSelected}
                            onCheckedChange={toggleAllSelection}
                          />
                          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                            전체 선택
                          </label>
                        </div>
                        {selectedItems.size > 0 && (
                          <Badge variant="secondary" className="px-2 py-1 text-xs">
                            {selectedItems.size}개 선택됨
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 항목 추가 버튼 - 상단으로 이동 */}
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddItemForm(!showAddItemForm)}
                        className="gap-2 h-8 px-3 text-sm"
                        size="sm"
                      >
                        <Plus className="h-3 w-3" />
                        항목 추가
                      </Button>
                      
                      {selectedItems.size > 0 && (
                        <Button
                          onClick={processBulkOutgoing}
                          disabled={isProcessing}
                          className="gap-2 h-8 px-4 text-sm"
                          size="sm"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              처리 중...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-3 w-3" />
                              일괄 출고 ({selectedItems.size}개)
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* 항목 추가 폼 */}
                    {showAddItemForm && (
                      <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <h4 className="font-medium text-sm">새 항목 추가</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* 항목 유형 선택 */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium">항목 유형</label>
                            <Select value={addItemType} onValueChange={(value: 'ingredient' | 'container') => setAddItemType(value)}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ingredient">
                                  <div className="flex items-center gap-2">
                                    <Tag className="h-3 w-3" />
                                    식재료
                                  </div>
                                </SelectItem>
                                <SelectItem value="container">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-3 w-3" />
                                    용기
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 수량 입력 */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium">수량</label>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={addItemQuantity}
                              onChange={(e) => setAddItemQuantity(parseFloat(e.target.value) || 1)}
                              placeholder="수량"
                              className="h-8"
                            />
                          </div>

                          {/* 항목 검색 */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium">항목 검색</label>
                            <div className="flex gap-2">
                              <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`${addItemType === 'ingredient' ? '식재료' : '용기'} 이름`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    searchItems();
                                  }
                                }}
                                className="h-8"
                              />
                              <Button
                                onClick={searchItems}
                                disabled={isSearching}
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                              >
                                {isSearching ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Search className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 검색 결과 */}
                        {searchResults.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium">검색 결과</label>
                            <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
                              {searchResults.map((item) => {
                                const isAlreadyExists = isItemAlreadyExists(item.name);
                                const isSelected = selectedSearchItems.some(selected => selected.id === item.id);
                                
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => !isAlreadyExists && toggleSearchItemSelection(item)}
                                    className={cn(
                                      "p-2 border-b last:border-b-0 text-sm flex items-center gap-2",
                                      !isAlreadyExists && "cursor-pointer hover:bg-muted",
                                      isSelected && "bg-muted",
                                      isAlreadyExists && "opacity-50 cursor-not-allowed bg-muted/30"
                                    )}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      disabled={isAlreadyExists}
                                      onCheckedChange={() => !isAlreadyExists && toggleSearchItemSelection(item)}
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="font-medium flex items-center gap-2">
                                            {item.name}
                                            {isAlreadyExists && (
                                              <Badge variant="outline" className="text-xs">
                                                이미 존재
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.code_name && `코드: ${item.code_name} • `}
                                            {item.unit && `단위: ${item.unit}`}
                                            {item.stock_grade && ` • 등급: ${item.stock_grade}`}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 버튼들 */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddItemForm(false);
                              setSearchQuery('');
                              setSearchResults([]);
                              setSelectedSearchItems([]);
                              setAddItemQuantity(1);
                            }}
                            size="sm"
                            className="h-8 px-3"
                          >
                            취소
                          </Button>
                          <Button
                            onClick={addItem}
                            disabled={selectedSearchItems.length === 0}
                            size="sm"
                            className="h-8 px-3"
                          >
                            추가 ({selectedSearchItems.length}개)
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 테이블 */}
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px] py-2">선택</TableHead>
                            <TableHead className="w-[80px] py-2">유형</TableHead>
                            <TableHead className="w-[200px] py-2">항목명</TableHead>
                            <TableHead className="w-[100px] py-2">코드</TableHead>
                            <TableHead className="w-[150px] text-right py-2">필요 수량</TableHead>
                            <TableHead className="w-[100px] py-2">재고 등급</TableHead>
                            <TableHead className="py-2">공급업체</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allItems.map((item) => {
                            const isAdditionalItem = item.id.startsWith('additional_');
                            return (
                              <TableRow 
                                key={item.id}
                                className={cn(
                                  "hover:bg-muted/50",
                                  selectedItems.has(item.id) && "bg-muted",
                                  isAdditionalItem && "bg-accent/50"
                                )}
                              >
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1">
                                    <Checkbox
                                      checked={selectedItems.has(item.id)}
                                      onCheckedChange={() => toggleItemSelection(item.id)}
                                    />
                                    {isAdditionalItem && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeAdditionalItem(item.id)}
                                        className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1">
                                    <Badge 
                                      variant={item.item_type === 'ingredient' ? 'secondary' : 'outline'}
                                      className="text-xs"
                                    >
                                      {item.item_type === 'ingredient' ? '식재료' : '용기'}
                                    </Badge>
                                    {isAdditionalItem && (
                                      <Badge variant="default" className="text-xs">
                                        추가
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium py-2 text-sm">{item.name}</TableCell>
                                <TableCell className="text-muted-foreground py-2 text-sm font-mono">
                                  {item.code_name || '-'}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <div className="flex flex-col items-end gap-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={getActualQuantity(item)}
                                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                      className="w-20 h-7 text-right text-xs font-mono"
                                    />
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs text-muted-foreground">
                                        {item.unit}
                                      </span>
                                      {editedQuantities.has(item.id) && editedQuantities.get(item.id) !== item.total_amount && (
                                        <span className="text-xs text-orange-600">
                                          (원래: {formatNumber(item.total_amount)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  {item.stock_grade ? (
                                    <Badge variant="outline" className="text-xs">
                                      {item.stock_grade} 등급
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground py-2 text-sm">
                                  {item.supplier || '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center space-y-4">
                      <div className="p-3 bg-muted rounded-full w-fit mx-auto">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base mb-2">조리계획서가 없습니다</h3>
                        <p className="text-muted-foreground text-sm">
                          {cookingPlanData.message || '해당 날짜의 조리계획서가 없거나 재고 관리 대상 항목이 없습니다.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="px-4 h-9"
            >
              취소
            </Button>
            {allItems.length > 0 && selectedItems.size > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  <Users className="inline h-4 w-4 mr-1" />
                  {selectedItems.size}개 항목 선택됨
                </div>
                <Button
                  onClick={processBulkOutgoing}
                  disabled={isProcessing}
                  className="gap-2 px-4 h-9"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      일괄 출고 처리
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 