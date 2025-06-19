"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockTransaction, StockTransactionTable, PaginationInfo } from "@/components/stock/StockTransactionTable";
import {
  RefreshCw,
  Loader2,
  X,
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  Package,
  Box,
  AlertCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatQuantity } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { StockItem } from "./StockTable";

interface StockItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  item: StockItem | null;
}

// 특정 날짜 재고 조회 결과 타입
interface HistoricalStockData {
  stockItemId: string;
  itemType: string;
  itemName: string;
  unit: string;
  quantity: number;
  date: string;
  calculationMethod: string;
  calculationTime: string;
  transactionsProcessed: number;
  baseSnapshot?: {
    date: string;
    quantity: number;
  } | null;
}

export function StockItemDetailModal({
  open,
  onOpenChange,
  companyId,
  item,
}: StockItemDetailModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [detailedItem, setDetailedItem] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 5,
    pageCount: 0,
  });

  // 특정 날짜 재고 조회 관련 상태
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<HistoricalStockData | null>(null);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);

  // 재고 항목 상세 정보 조회
  const fetchItemDetail = async () => {
    if (!item?.id || !companyId) {
      console.warn('필수 매개변수 누락:', { itemId: item?.id, companyId });
      return;
    }

    // 임시 아이템인 경우 처리하지 않음
    if (item.id.startsWith('temp_')) {
      console.warn('임시 아이템은 상세 조회를 지원하지 않습니다:', item.id);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('재고 항목 상세 조회 시작:', { 
        itemId: item.id, 
        companyId,
        itemType: item.item_type,
        itemName: item.name 
      });
      
      const response = await fetch(`/api/companies/${companyId}/stock/items/${item.id}`);
      
      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API 응답 오류:', { 
          status: response.status, 
          statusText: response.statusText,
          errorData 
        });
        throw new Error(errorData.error || `API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      if (!data.item) {
        console.error('응답에서 item 데이터를 찾을 수 없습니다:', data);
        throw new Error('재고 항목을 찾을 수 없습니다.');
      }

      setDetailedItem(data.item);
      console.log('상세 데이터 설정 완료:', data.item);
    } catch (error) {
      console.error('재고 항목 상세 조회 오류:', error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "재고 항목 정보를 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 내역 조회
  const fetchTransactions = async () => {
    if (!detailedItem?.stockItemIds || !companyId) {
      console.warn('거래 내역 조회: stockItemIds 또는 companyId가 없습니다:', { 
        stockItemIds: detailedItem?.stockItemIds, 
        companyId 
      });
      return;
    }
    
    try {
      // 모든 창고의 재고 항목들에 대한 거래 내역을 조회하기 위해
      // stockItemIds 배열의 모든 ID에 대해 거래 내역을 조회
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      // 모든 stockItemIds를 쿼리 파라미터로 추가
      detailedItem.stockItemIds.forEach((id: string) => {
        queryParams.append('stockItemIds', id);
      });

      console.log('거래 내역 조회 시작:', { 
        companyId, 
        stockItemIds: detailedItem.stockItemIds, 
        page: pagination.page 
      });
      
      const response = await fetch(
        `/api/companies/${companyId}/stock/transactions?${queryParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('거래 내역 API 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.error || `서버 오류 (${response.status}): 거래 내역을 가져오는데 실패했습니다`);
      }

      const data = await response.json();
      console.log('거래 내역 조회 성공:', { count: data.transactions?.length || 0 });
      setTransactions(data.transactions || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("거래 내역 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "거래 내역을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 특정 날짜 재고 조회
  const fetchHistoricalStock = async (dateString: string) => {
    if (!item?.id || !dateString || !companyId) {
      console.warn('특정 날짜 재고 조회: 필수 파라미터가 없습니다:', { itemId: item?.id, dateString, companyId });
      return;
    }
    
    setIsHistoricalLoading(true);
    try {
      console.log('특정 날짜 재고 조회 시작:', { companyId, itemId: item.id, dateString });
      const response = await fetch(
        `/api/companies/${companyId}/stock/items/${item.id}/historical?date=${dateString}`
      );

      const result = await response.json();
      
      if (response.ok && result.success) {
        setHistoricalData(result.data);
        toast({
          title: "조회 완료",
          description: `${format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko })} 재고 현황을 조회했습니다.`,
        });
      } else {
        // 404 오류 또는 데이터가 없는 경우
        if (response.status === 404 || result.error?.includes('찾을 수 없습니다')) {
          toast({
            title: "데이터 없음",
            description: `${format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko })}에는 재고 데이터가 없습니다. 재고 생성 이후의 날짜를 선택해주세요.`,
            variant: "default",
          });
        } else {
          toast({
            title: "조회 실패",
            description: result.error || "특정 날짜 재고 조회 중 문제가 발생했습니다.",
            variant: "destructive",
          });
        }
        setHistoricalData(null);
      }
    } catch (error) {
      console.error("특정 날짜 재고 조회 오류:", error);
      toast({
        title: "조회 실패",
        description: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
      setHistoricalData(null);
    } finally {
      setIsHistoricalLoading(false);
    }
  };

  // 날짜 선택 핸들러
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = event.target.value;
    setSelectedDate(dateString);
    if (dateString) {
      fetchHistoricalStock(dateString);
    }
  };

  // 특정 날짜 재고 초기화
  const clearHistoricalData = () => {
    setSelectedDate('');
    setHistoricalData(null);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (open && item && !item.id.startsWith("temp_")) {
      console.log('모달 오픈 - 데이터 로드 시작:', { itemId: item.id, companyId });
      fetchItemDetail();
    } else if (!open) {
      // 모달이 닫힐 때 상태 초기화
      console.log('모달 닫힘 - 상태 초기화');
      setDetailedItem(null);
      setTransactions([]);
      setPagination({
        total: 0,
        page: 1,
        pageSize: 5,
        pageCount: 0,
      });
      // 특정 날짜 재고 관련 상태도 초기화
      clearHistoricalData();
         } else if (open && (!item || item.id.startsWith("temp_"))) {
       console.warn('유효하지 않은 itemId로 모달이 열렸습니다:', item?.id);
    }
  }, [open, item, companyId]);

  // 재고 항목 로딩 후 거래 내역 로딩
  useEffect(() => {
    if (detailedItem && detailedItem.stockItemIds && detailedItem.stockItemIds.length > 0) {
      console.log('상세 항목 로딩 완료 - 거래 내역 조회 시작');
      fetchTransactions();
    }
  }, [detailedItem, pagination.page, open]);

  // 항목 유형에 따른 표시 설정
  const getItemTypeBadge = (type: string) => {
    if (type === "ingredient") {
      return <Badge variant="secondary" className="mr-2">식자재</Badge>;
    } else {
      return <Badge variant="outline" className="mr-2">용기</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] max-w-6xl mx-auto overflow-y-auto" closeButton={false}>
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center">
              {detailedItem && getItemTypeBadge(detailedItem.item_type)}
              {detailedItem ? detailedItem.details?.name || detailedItem.name || "재고 항목" : item?.name || "로딩 중..."}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {!isLoading && detailedItem && (
                <Button variant="outline" size="sm" onClick={fetchItemDetail}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription>
            재고 항목의 상세 정보 및 거래 내역을 확인합니다.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40">
            <h2 className="text-xl font-semibold mb-2">오류 발생</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            {item?.id && (
              <div className="text-sm text-muted-foreground mb-4">
                <strong>디버그 정보:</strong> Item ID: {item.id}, Company ID: {companyId}
              </div>
            )}
            <Button onClick={fetchItemDetail} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        ) : !detailedItem ? (
          <div className="flex flex-col items-center justify-center h-40">
            <h2 className="text-xl font-semibold mb-2">재고 항목을 찾을 수 없습니다</h2>
            <p className="text-muted-foreground mb-4">요청하신 재고 항목이 존재하지 않거나 접근 권한이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>재고 항목 정보</CardTitle>
                <CardDescription>재고 항목의 상세 정보 및 현재 상태입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">항목 유형</h3>
                    <p>{detailedItem.item_type === "ingredient" ? "식자재" : "용기"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">코드명</h3>
                    <p>{detailedItem.details?.code_name || "-"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">현재 수량</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-xl font-semibold">
                        {formatQuantity(detailedItem.current_quantity, detailedItem.unit)} {
                          detailedItem.unit === "g" ? "kg" : 
                          detailedItem.unit === "ml" ? "l" : 
                          detailedItem.unit
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">최종 업데이트</h3>
                    <p>
                      {new Date(detailedItem.last_updated).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* 창고별 재고 현황 */}
                {detailedItem.warehouseStocks && Object.keys(detailedItem.warehouseStocks).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">창고별 재고 현황</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.values(detailedItem.warehouseStocks).map((warehouseStock: any) => (
                        <div 
                          key={warehouseStock.warehouseId} 
                          className="border rounded-lg p-3 bg-gray-50"
                        >
                          <div className="font-medium text-sm mb-1">{warehouseStock.warehouseName}</div>
                          <div className="text-lg font-semibold text-blue-600">
                            {warehouseStock.quantity?.toLocaleString() || 0} {warehouseStock.unit || '개'}
                          </div>
                          {warehouseStock.lastUpdated && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(warehouseStock.lastUpdated).toLocaleString('ko-KR')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailedItem.item_type === "ingredient" && (
                  <div className="space-y-4">
                    <h3 className="font-medium">식자재 상세 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {detailedItem.details?.supplier && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">공급업체</h4>
                          <p>{detailedItem.details.supplier}</p>
                        </div>
                      )}
                      {detailedItem.details?.stock_grade && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">재고 등급</h4>
                          <p>{detailedItem.details.stock_grade}</p>
                        </div>
                      )}
                      {detailedItem.details?.price && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">단가</h4>
                          <p>{detailedItem.details.price.toLocaleString()}원</p>
                        </div>
                      )}
                      {detailedItem.details?.category && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">카테고리</h4>
                          <p>{detailedItem.details.category}</p>
                        </div>
                      )}
                      {detailedItem.details?.description && (
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground">설명</h4>
                          <p>{detailedItem.details.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailedItem.item_type === "container" && (
                  <div className="space-y-4">
                    <h3 className="font-medium">용기 상세 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {detailedItem.details?.category && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">카테고리</h4>
                          <p>{detailedItem.details.category}</p>
                        </div>
                      )}
                      {detailedItem.details?.price && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">가격</h4>
                          <p>{detailedItem.details.price.toLocaleString()}원</p>
                        </div>
                      )}
                      {detailedItem.details?.description && (
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground">설명</h4>
                          <p>{detailedItem.details.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 최근 거래 내역 */}
            {detailedItem.recentTransactions && detailedItem.recentTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    최근 거래 내역
                  </CardTitle>
                  <CardDescription>
                    최근 10개의 거래 내역을 확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">날짜</th>
                            <th className="px-3 py-2 text-left">유형</th>
                            <th className="px-3 py-2 text-right">수량</th>
                            <th className="px-3 py-2 text-left">메모</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailedItem.recentTransactions.map((transaction: any) => (
                            <tr key={transaction.id} className="border-t">
                              <td className="px-3 py-2">
                                {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  transaction.transaction_type === 'add' 
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.transaction_type === 'remove'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {transaction.transaction_type === 'add' ? '입고' : 
                                   transaction.transaction_type === 'remove' ? '출고' : '이동'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change} {transaction.unit}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {transaction.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 특정 날짜 재고 조회 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  특정 날짜 재고 조회
                </CardTitle>
                <CardDescription>
                  원하는 날짜의 재고 현황을 조회할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      max={new Date().toISOString().split('T')[0]}
                      min="2020-01-01"
                      className="px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                  </div>

                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistoricalData}
                    >
                      <X className="mr-2 h-4 w-4" />
                      초기화
                    </Button>
                  )}
                </div>

                {isHistoricalLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>재고 현황을 조회하고 있습니다...</span>
                  </div>
                )}

                {historicalData && !isHistoricalLoading && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">조회 날짜</h4>
                        <p className="text-lg font-semibold">
                          {format(new Date(historicalData.date), "yyyy년 MM월 dd일", { locale: ko })}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">해당 날짜 재고량</h4>
                        <p className="text-lg font-semibold text-primary">
                          {formatQuantity(historicalData.quantity, historicalData.unit)} {
                            historicalData.unit === "g" ? "kg" : 
                            historicalData.unit === "ml" ? "l" : 
                            historicalData.unit
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">현재 재고와의 차이</h4>
                        <p className={cn(
                          "text-lg font-semibold",
                          detailedItem.current_quantity - historicalData.quantity > 0 ? "text-green-600" : 
                          detailedItem.current_quantity - historicalData.quantity < 0 ? "text-red-600" : 
                          "text-gray-600"
                        )}>
                          {detailedItem.current_quantity - historicalData.quantity > 0 ? "+" : ""}
                          {formatQuantity(detailedItem.current_quantity - historicalData.quantity, detailedItem.unit)} {
                            detailedItem.unit === "g" ? "kg" : 
                            detailedItem.unit === "ml" ? "l" : 
                            detailedItem.unit
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">계산 방법</h4>
                        <p className="text-sm">
                          {historicalData.calculationMethod}
                          {historicalData.baseSnapshot && (
                            <span className="block text-xs text-muted-foreground mt-1">
                              기준 스냅샷: {format(new Date(historicalData.baseSnapshot.date), "yyyy-MM-dd", { locale: ko })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 거래 내역 테이블 */}
            {transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    전체 거래 내역
                  </CardTitle>
                  <CardDescription>
                    해당 재고 항목의 모든 거래 내역을 확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                                   <StockTransactionTable
                   transactions={transactions}
                   pagination={pagination}
                   onPageChange={handlePageChange}
                   isLoading={false}
                   onRefresh={fetchTransactions}
                 />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
} 