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
  initialDate?: string;
}

export function CookingPlanImportModal({
  open,
  onOpenChange,
  companyId,
  onImportComplete,
  initialDate,
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



  // 컴포넌트 마운트 상태 추적을 위한 ref
  const isMountedRef = useRef(true);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 초기 날짜 설정 효과
  useEffect(() => {
    if (open && initialDate && !selectedDate) {
      // initialDate가 있고 모달이 열렸을 때, 아직 날짜가 선택되지 않았다면 초기 날짜 설정
      try {
        const date = new Date(initialDate);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          // 초기 날짜가 설정되면 자동으로 조리계획서 데이터 로드
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchCookingPlan();
            }
          }, 100);
        }
      } catch (error) {
        console.error('초기 날짜 설정 오류:', error);
      }
    }
  }, [open, initialDate, selectedDate]);

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



  // 조리계획서 조회
  const fetchCookingPlan = useCallback(async () => {
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
  }, [selectedDate, companyId, toast, safeSetState]);

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
    if (!cookingPlanData) return;

    safeSetState(() => {
      const allItems = [...cookingPlanData.ingredients, ...cookingPlanData.containers];
      const allItemIds = allItems.map(item => item.id);
      
      if (selectedItems.size === allItemIds.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(allItemIds));
      }
    });
  }, [cookingPlanData, selectedItems, safeSetState]);

  // 용기의 parent 정보를 가져오는 함수 (ID와 이름 모두 반환)
  const getContainerParentInfo = async (containerId: string): Promise<{parentId: string | null, parentName: string | null}> => {
    try {
      const response = await fetch(`/api/companies/${companyId}/containers?flat=true`);
      if (!response.ok) return { parentId: null, parentName: null };
      
      const containers = await response.json();
      const container = containers.find((c: any) => c.id === containerId);
      
      if (!container?.parent_container_id) {
        return { parentId: null, parentName: null };
      }
      
      // parent 정보 찾기
      const parentContainer = containers.find((c: any) => c.id === container.parent_container_id);
      
      return {
        parentId: container.parent_container_id,
        parentName: parentContainer?.name || null
      };
    } catch (error) {
      console.error('용기 parent 정보 조회 오류:', error);
      return { parentId: null, parentName: null };
    }
  };

  const processBulkOutgoing = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: '항목을 선택해주세요',
        description: '출고할 항목을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers] : [];
    if (allItems.length === 0) return;

    safeSetState(() => setIsProcessing(true));
    
    try {
      const selectedItemsData = allItems.filter(item => selectedItems.has(item.id));

      // 개별 거래 기록용 데이터
      const transactionItems: { stockItemId: string; quantity: number; itemName: string; isMaxInGroup?: boolean; }[] = [];
      // 실제 재고 차감용 데이터 (그룹별 최대값)
      const stockAdjustments: { stockItemId: string; quantity: number; }[] = [];
      // 용기 그룹별 수량 추적 (parentId를 키로 사용)
      const containerGroups: Map<string, { 
        maxQuantity: number; 
        stockItemId: string; 
        items: { name: string; quantity: number; stockItemId: string; }[];
        maxItem: string;
      }> = new Map();
      const failedItems: string[] = [];

      for (const item of selectedItemsData) {
        try {
          let targetItemId = item.id;
          let searchName = item.name;
          let parentId: string | null = null;
          
          // 용기 타입인 경우 parent 확인
          if (item.item_type === 'container') {
            const parentInfo = await getContainerParentInfo(item.id);
            if (parentInfo.parentId && parentInfo.parentName) {
              // parent가 있으면 parent 그룹의 재고에서 차감하도록 설정
              targetItemId = parentInfo.parentId;
              searchName = parentInfo.parentName;
              parentId = parentInfo.parentId;
            }
          }

          // 해당 항목의 재고 항목 ID를 찾기
          const stockItemResponse = await fetch(
            `/api/companies/${companyId}/stock/items?itemType=${item.item_type}&query=${encodeURIComponent(searchName)}&stockGrade=all`
          );
          
          if (!stockItemResponse.ok) {
            failedItems.push(`${item.name} (재고 정보 조회 실패)`);
            continue;
          }

          const stockData = await stockItemResponse.json();
          const stockItem = stockData.items.find((si: any) => 
            si.details?.name === searchName || si.name === searchName
          );

          let finalStockItemId: string;
          if (!stockItem) {
            // 재고 항목이 없으면 임시 ID 생성
            let tempId;
            if (targetItemId.startsWith('temp_')) {
              tempId = targetItemId;
            } else {
              tempId = `temp_${item.item_type}_${targetItemId}`;
            }
            finalStockItemId = tempId;
          } else {
            finalStockItemId = stockItem.id;
          }

          const quantity = getActualQuantity(item);

          // 용기 그룹별 처리
          if (item.item_type === 'container' && parentId) {
            // 같은 parent를 가진 용기들을 그룹핑 (parentId를 키로 사용)
            const groupKey = parentId;
            
            // parent의 재고 아이템 ID는 이미 finalStockItemId가 parent 기준으로 조회됨
            // (위에서 searchName이 parent 이름으로 설정되었기 때문)
            const parentStockItemId = finalStockItemId;
            
            if (containerGroups.has(groupKey)) {
              const group = containerGroups.get(groupKey)!;
              group.items.push({ name: item.name, quantity, stockItemId: parentStockItemId });
              
              // 최대 수량 업데이트
              if (quantity > group.maxQuantity) {
                group.maxQuantity = quantity;
                group.maxItem = item.name;
              }
            } else {
              containerGroups.set(groupKey, {
                maxQuantity: quantity,
                stockItemId: parentStockItemId, // parent의 재고 아이템 ID 사용
                items: [{ name: item.name, quantity, stockItemId: parentStockItemId }],
                maxItem: item.name
              });
            }
          } else {
            // 식자재이거나 독립적인 용기는 개별 처리
            transactionItems.push({
              stockItemId: finalStockItemId,
              quantity,
              itemName: item.name,
              isMaxInGroup: true // 독립 항목은 항상 표시
            });
            
            stockAdjustments.push({
              stockItemId: finalStockItemId,
              quantity
            });
          }
        } catch (error) {
          console.error(`${item.name} 처리 오류:`, error);
          failedItems.push(`${item.name} (처리 오류)`);
        }
      }

      // 용기 그룹별 처리: 모든 아이템을 transactionItems에 추가하되, 최대값만 표시용으로 마킹
      containerGroups.forEach(group => {
        // 모든 그룹 아이템을 거래 기록에 추가
        group.items.forEach(item => {
          transactionItems.push({
            stockItemId: item.stockItemId,
            quantity: item.quantity,
            itemName: item.name,
            isMaxInGroup: item.name === group.maxItem // 최대값 아이템만 표시용으로 마킹
          });
        });
        
        // 최대 수량만 실제 재고 차감에 추가
        stockAdjustments.push({
          stockItemId: group.stockItemId,
          quantity: group.maxQuantity
        });
      });

      if (transactionItems.length === 0) {
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
            transactionItems, // 개별 거래 기록용 (isMaxInGroup 정보 포함)
            stockAdjustments, // 실제 재고 차감용
            requestType: 'outgoing',
            notes: `조리계획서 기반 출고 (${cookingPlanData?.date || format(selectedDate!, 'yyyy-MM-dd')}) - 그룹별 최대 수량 적용`,
            directProcess: true,
            isGroupedTransaction: true // 그룹화된 거래임을 표시
          }),
        }
      );

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.error || '일괄 출고 처리에 실패했습니다');
      }

      const successful = transactionItems.length;
      const failed = failedItems.length;

      // 그룹화 정보 표시
      let groupInfo = '';
      if (containerGroups.size > 0) {
        const groupDetails = Array.from(containerGroups.values()).map(group => 
          `${group.items.map(item => item.name).join(', ')} → 최대 ${group.maxQuantity}개 (${group.maxItem})`
        ).join('; ');
        groupInfo = `용기 그룹 최적화: ${groupDetails}`;
      }

      if (failed > 0) {
        toast({
          title: `일부 항목 처리 완료 (${successful}/${selectedItems.size})`,
          description: `실패한 항목: ${failedItems.join(', ')}`,
        });
      } else {
        toast({
          title: '일괄 출고 완료',
          description: `${successful}개 항목이 성공적으로 출고 처리되었습니다.${groupInfo ? ` ${groupInfo}` : ''}`,
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

  const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers] : [];
  const isAllSelected = allItems.length > 0 && selectedItems.size === allItems.length;
  const today = new Date();

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
                            총 {allItems.length}개 항목 (조리계획서)
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
                    {/* 일괄 출고 버튼 */}
                    {selectedItems.size > 0 && (
                      <div className="flex justify-end">
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
                            return (
                              <TableRow 
                                key={item.id}
                                className={cn(
                                  "hover:bg-muted/50",
                                  selectedItems.has(item.id) && "bg-muted"
                                )}
                              >
                                <TableCell className="py-2">
                                  <Checkbox
                                    checked={selectedItems.has(item.id)}
                                    onCheckedChange={() => toggleItemSelection(item.id)}
                                  />
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge 
                                    variant={item.item_type === 'ingredient' ? 'secondary' : 'outline'}
                                    className="text-xs"
                                  >
                                    {item.item_type === 'ingredient' ? '식재료' : '용기'}
                                  </Badge>
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