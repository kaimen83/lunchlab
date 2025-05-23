'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileText, Loader2, ShoppingCart } from 'lucide-react';
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

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      // 약간의 지연을 두고 상태 초기화 (DOM 업데이트 완료 후)
      const timeoutId = setTimeout(() => {
        setCookingPlanData(null);
        setSelectedItems(new Set());
        setSelectedDate(undefined);
        setIsLoading(false);
        setIsProcessing(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // 숫자 포맷 함수 (천단위 구분자)
  const formatNumber = (value: number) => {
    return value.toLocaleString('ko-KR');
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

    setIsLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/companies/${companyId}/cooking-plans/${dateString}/stock-requirements`
      );

      if (!response.ok) {
        throw new Error('조리계획서를 조회하는데 실패했습니다');
      }

      const result = await response.json();
      setCookingPlanData(result.data);
      setSelectedItems(new Set()); // 선택 항목 초기화

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
      setIsLoading(false);
    }
  };

  // 항목 선택/해제
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (!cookingPlanData) return;

    const allItems = [...cookingPlanData.ingredients, ...cookingPlanData.containers];
    const allItemIds = allItems.map(item => item.id);
    
    if (selectedItems.size === allItemIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allItemIds));
    }
  };

  // 일괄 출고 처리
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

    setIsProcessing(true);
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
          quantities.push(item.total_amount);
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
            notes: `조리계획서 기반 출고 (${cookingPlanData.date})`,
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
        
        // 약간의 지연 후 모달 닫기 (DOM 업데이트 완료 대기)
        setTimeout(() => {
          onOpenChange(false);
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
      setIsProcessing(false);
    }
  };

  // 모달 닫기 핸들러
  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing) {
      onOpenChange(false);
    }
  };

  const allItems = cookingPlanData ? [...cookingPlanData.ingredients, ...cookingPlanData.containers] : [];
  const isAllSelected = allItems.length > 0 && selectedItems.size === allItems.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            조리계획서 불러오기
          </DialogTitle>
          <DialogDescription>
            특정 날짜의 조리계획서에서 재고 등급이 있는 식재료와 용기를 불러와 일괄 출고 처리할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 날짜 선택 */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">날짜 선택</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko })
                    ) : (
                      '날짜를 선택하세요'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={fetchCookingPlan}
              disabled={!selectedDate || isLoading}
              className="mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  조회 중...
                </>
              ) : (
                '조리계획서 조회'
              )}
            </Button>
          </div>

          {/* 조리계획서 데이터 표시 */}
          {cookingPlanData && allItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {format(new Date(cookingPlanData.date), 'yyyy년 MM월 dd일', { locale: ko })} 조리계획서
                  </h3>
                  <Badge variant="secondary">
                    총 {allItems.length}개 항목
                  </Badge>
                </div>
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
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">선택</TableHead>
                      <TableHead className="w-[80px]">유형</TableHead>
                      <TableHead>항목명</TableHead>
                      <TableHead className="w-[100px]">코드</TableHead>
                      <TableHead className="w-[120px]">필요 수량</TableHead>
                      <TableHead className="w-[100px]">재고 등급</TableHead>
                      <TableHead>공급업체</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.item_type === 'ingredient' ? 'secondary' : 'outline'}>
                            {item.item_type === 'ingredient' ? '식자재' : '용기'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.code_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.total_amount)} {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.stock_grade ? (
                            <Badge variant="outline">{item.stock_grade} 등급</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 조리계획서가 없는 경우 */}
          {cookingPlanData && allItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>해당 날짜의 조리계획서가 없거나 재고 관리 대상 항목이 없습니다.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            취소
          </Button>
          {cookingPlanData && selectedItems.size > 0 && (
            <Button
              onClick={processBulkOutgoing}
              disabled={isProcessing}
              className="gap-2"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 