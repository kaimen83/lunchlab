'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileText, Loader2, ShoppingCart, Search, CheckCircle2, AlertCircle, Edit3, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

// Error Boundary Component
class PortalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // DOM 관련 에러만 처리
    if (error.message.includes('removeChild') || error.message.includes('Node')) {
      console.warn('Portal DOM error caught and handled:', error);
      return { hasError: false }; // 에러를 무시하고 계속 진행
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    if (error.message.includes('removeChild') || error.message.includes('Node')) {
      console.warn('Portal cleanup error handled:', error, errorInfo);
      return;
    }
    console.error('Portal error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
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
  
  // 수정 모드 관련 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<Map<string, number>>(new Map());

  // Popover 상태 명시적 관리
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 컴포넌트 마운트 상태 추적을 위한 ref
  const isMountedRef = useRef(true);
  
  // Portal 컨테이너 ref (Dialog와 Popover가 같은 컨테이너 사용)
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  // Portal 컨테이너 생성 및 정리
  useEffect(() => {
    if (open && !portalContainerRef.current) {
      // Portal 컨테이너 생성
      const container = document.createElement('div');
      container.id = 'cooking-plan-modal-portal';
      container.style.position = 'relative';
      container.style.zIndex = '50';
      document.body.appendChild(container);
      portalContainerRef.current = container;
    }

    return () => {
      // Portal 컨테이너 정리
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        try {
          portalContainerRef.current.parentNode.removeChild(portalContainerRef.current);
        } catch (error) {
          console.warn('Portal container cleanup warning:', error);
        }
        portalContainerRef.current = null;
      }
    };
  }, [open]);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 컴포넌트 언마운트 시 모든 팝오버 강제 닫기
      try {
        setIsCalendarOpen(false);
      } catch (error) {
        console.warn('Calendar popover cleanup warning:', error);
      }
    };
  }, []);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      // 먼저 팝오버 닫기
      if (isMountedRef.current) {
        setIsCalendarOpen(false);
      }
      
      // 약간의 지연을 두고 상태 초기화 (DOM 업데이트 완료 후)
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setCookingPlanData(null);
          setSelectedItems(new Set());
          setSelectedDate(undefined);
          setIsLoading(false);
          setIsProcessing(false);
          setIsEditMode(false);
          setEditedQuantities(new Map());
        }
      }, 200);

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

  // 수정 모드 토글
  const toggleEditMode = useCallback(() => {
    safeSetState(() => {
      if (isEditMode) {
        // 수정 모드 종료 시 변경사항 초기화
        setEditedQuantities(new Map());
      } else {
        // 수정 모드 시작 시 현재 수량으로 초기화
        if (cookingPlanData) {
          const allItems = [...cookingPlanData.ingredients, ...cookingPlanData.containers];
          const initialQuantities = new Map<string, number>();
          allItems.forEach(item => {
            initialQuantities.set(item.id, item.total_amount);
          });
          setEditedQuantities(initialQuantities);
        }
      }
      setIsEditMode(!isEditMode);
    });
  }, [isEditMode, cookingPlanData, safeSetState]);

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
        setIsEditMode(false); // 수정 모드 초기화
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

    if (!cookingPlanData) return;

    safeSetState(() => setIsProcessing(true));
    
    try {
      const allItems = [...cookingPlanData.ingredients, ...cookingPlanData.containers];
      const selectedItemsData = allItems.filter(item => selectedItems.has(item.id));

      // 선택된 항목들의 재고 항목 ID를 찾기
      const stockItemIds: string[] = [];
      const quantities: number[] = [];
      const failedItems: string[] = [];

      for (const item of selectedItemsData) {
        try {
          // 해당 항목의 재고 항목 ID를 찾기
          const stockItemResponse = await fetch(
            `/api/companies/${companyId}/stock/items?itemType=${item.item_type}&query=${encodeURIComponent(item.name)}`
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
            failedItems.push(`${item.name} (재고 항목 없음)`);
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
            notes: `조리계획서 기반 출고 (${cookingPlanData.date})${isEditMode ? ' - 수량 수정됨' : ''}`,
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
        // 먼저 콜백 호출
        onImportComplete();
        
        // 단계적 모달 닫기 프로세스
        safeSetState(() => setIsCalendarOpen(false)); // 먼저 팝오버 닫기
        
        setTimeout(() => {
          if (isMountedRef.current) {
            onOpenChange(false); // 그 다음 모달 닫기
          }
        }, 100); // 짧은 지연 시간으로 변경
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

  // 모달 닫기 핸들러 (즉시 닫기로 변경)
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && !isProcessing && isMountedRef.current) {
      // 즉시 팝오버와 모달 닫기
      safeSetState(() => setIsCalendarOpen(false));
      onOpenChange(false);
    }
  }, [isProcessing, safeSetState, onOpenChange]);

  const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers] : [];
  const isAllSelected = allItems.length > 0 && selectedItems.size === allItems.length;
  const today = new Date();

  return (
    <PortalErrorBoundary>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogPortal container={portalContainerRef.current}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                조리계획서 불러오기
              </DialogTitle>
              <DialogDescription className="text-base">
                특정 날짜의 조리계획서에서 재고 등급이 있는 식재료와 용기를 불러와 필요수량을 수정한 후 일괄 출고 처리할 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* 날짜 선택 섹션 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">날짜 선택</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <Popover 
                          open={isCalendarOpen} 
                          onOpenChange={setIsCalendarOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-[280px] justify-start text-left font-normal h-11',
                                !selectedDate && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-3 h-4 w-4" />
                              {selectedDate ? (
                                <span className="font-medium">
                                  {format(selectedDate, 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                                </span>
                              ) : (
                                '조리계획서 날짜를 선택하세요'
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0" 
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                setIsCalendarOpen(false); // 날짜 선택 시 팝오버 닫기
                              }}
                              locale={ko}
                              initialFocus
                              today={today}
                              className="rounded-md border"
                              modifiers={{
                                today: today
                              }}
                              modifiersStyles={{
                                today: {
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  borderRadius: '6px'
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          onClick={fetchCookingPlan}
                          disabled={!selectedDate || isLoading}
                          className="h-11 px-6"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              조회 중...
                            </>
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              조리계획서 조회
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 조리계획서 데이터 표시 */}
              {cookingPlanData && (
                <>
                  {allItems.length > 0 ? (
                    <Card>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">
                                  {format(new Date(cookingPlanData.date), 'yyyy년 MM월 dd일', { locale: ko })} 조리계획서
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  총 {allItems.length}개 항목이 발견되었습니다
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* 수정 모드 토글 버튼 */}
                              <Button
                                variant={isEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={toggleEditMode}
                                className="gap-2"
                              >
                                {isEditMode ? (
                                  <>
                                    <Save className="h-4 w-4" />
                                    수정 완료
                                  </>
                                ) : (
                                  <>
                                    <Edit3 className="h-4 w-4" />
                                    수량 수정
                                  </>
                                )}
                              </Button>
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
                                <Badge variant="secondary" className="px-3 py-1">
                                  {selectedItems.size}개 선택됨
                                </Badge>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* 테이블 */}
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead className="w-[50px]">선택</TableHead>
                                  <TableHead className="w-[80px]">유형</TableHead>
                                  <TableHead>항목명</TableHead>
                                  <TableHead className="w-[100px]">코드</TableHead>
                                  <TableHead className="w-[140px] text-right">
                                    {isEditMode ? '수정 수량' : '필요 수량'}
                                  </TableHead>
                                  <TableHead className="w-[100px]">재고 등급</TableHead>
                                  <TableHead>공급업체</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allItems.map((item) => (
                                  <TableRow 
                                    key={item.id}
                                    className={cn(
                                      "hover:bg-muted/50 transition-colors",
                                      selectedItems.has(item.id) && "bg-primary/5"
                                    )}
                                  >
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedItems.has(item.id)}
                                        onCheckedChange={() => toggleItemSelection(item.id)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={item.item_type === 'ingredient' ? 'secondary' : 'outline'}
                                        className="text-xs"
                                      >
                                        {item.item_type === 'ingredient' ? '식자재' : '용기'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {item.code_name || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {isEditMode ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={getActualQuantity(item)}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            className="w-24 h-8 text-right text-sm"
                                          />
                                          <span className="text-xs text-muted-foreground">
                                            {item.unit}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-end">
                                          <span className="font-semibold font-mono">
                                            {formatNumber(getActualQuantity(item))}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {item.unit}
                                          </span>
                                          {editedQuantities.has(item.id) && editedQuantities.get(item.id) !== item.total_amount && (
                                            <span className="text-xs text-orange-600 font-medium">
                                              (원래: {formatNumber(item.total_amount)})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {item.stock_grade ? (
                                        <Badge variant="outline" className="text-xs">
                                          {item.stock_grade} 등급
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {item.supplier || '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* 수정 모드 안내 메시지 */}
                          {isEditMode && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Edit3 className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-blue-900 mb-1">수량 수정 모드</h4>
                                  <p className="text-sm text-blue-700">
                                    각 항목의 필요수량을 직접 수정할 수 있습니다. 수정이 완료되면 "수정 완료" 버튼을 클릭하세요.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8">
                        <div className="text-center space-y-4">
                          <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto">
                            <AlertCircle className="h-8 w-8 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">조리계획서가 없습니다</h3>
                            <p className="text-muted-foreground">
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

            <DialogFooter className="pt-6 border-t">
              <div className="flex items-center justify-between w-full">
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenChange(false)}
                  disabled={isProcessing}
                  className="px-6"
                >
                  취소
                </Button>
                {cookingPlanData && selectedItems.size > 0 && (
                  <Button
                    onClick={processBulkOutgoing}
                    disabled={isProcessing}
                    className="gap-2 px-6"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" />
                        선택 항목 일괄 출고 ({selectedItems.size}개)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </PortalErrorBoundary>
  );
} 