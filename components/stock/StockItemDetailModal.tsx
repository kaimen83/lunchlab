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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatQuantity } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface StockItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  itemId: string | null;
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
  itemId,
}: StockItemDetailModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
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
    if (!itemId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/stock/items/${itemId}`);

      if (!response.ok) {
        throw new Error("재고 항목을 가져오는데 실패했습니다");
      }

      const data = await response.json();
      setItem(data.item);
    } catch (error) {
      console.error("재고 항목 상세 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: "재고 항목 정보를 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 내역 조회
  const fetchTransactions = async () => {
    if (!itemId) return;
    
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        stockItemId: itemId,
      });

      const response = await fetch(
        `/api/companies/${companyId}/stock/transactions?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("거래 내역을 가져오는데 실패했습니다");
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (error) {
      console.error("거래 내역 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: "거래 내역을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 특정 날짜 재고 조회
  const fetchHistoricalStock = async (dateString: string) => {
    if (!itemId || !dateString) return;
    
    setIsHistoricalLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/items/${itemId}/historical?date=${dateString}`
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
    if (open && itemId) {
      fetchItemDetail();
    } else {
      // 모달이 닫힐 때 상태 초기화
      setItem(null);
      setTransactions([]);
      setPagination({
        total: 0,
        page: 1,
        pageSize: 5,
        pageCount: 0,
      });
      // 특정 날짜 재고 관련 상태도 초기화
      clearHistoricalData();
    }
  }, [open, itemId]);

  // 재고 항목 로딩 후 거래 내역 로딩
  useEffect(() => {
    if (open && item) {
      fetchTransactions();
    }
  }, [item, pagination.page, open]);



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
              {item && getItemTypeBadge(item.item_type)}
              {item ? item.details?.name || "재고 항목" : "로딩 중..."}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {!isLoading && item && (
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
        ) : !item ? (
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
                    <p>{item.item_type === "ingredient" ? "식자재" : "용기"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">코드명</h3>
                    <p>{item.details?.code_name || "-"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">현재 수량</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-xl font-semibold">
                        {formatQuantity(item.current_quantity, item.unit)} {
                          item.unit === "g" ? "kg" : 
                          item.unit === "ml" ? "l" : 
                          item.unit
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">최종 업데이트</h3>
                    <p>
                      {new Date(item.last_updated).toLocaleDateString("ko-KR", {
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

                {item.item_type === "ingredient" && (
                  <div className="space-y-4">
                    <h3 className="font-medium">식자재 상세 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">공급업체</h4>
                        <p>{item.details?.supplier || "-"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">재고 등급</h4>
                        <p>{item.details?.stock_grade || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {item.item_type === "container" && (
                  <div className="space-y-4">
                    <h3 className="font-medium">용기 상세 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">카테고리</h4>
                        <p>{item.details?.category || "-"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">가격</h4>
                        <p>{item.details?.price ? `${item.details.price}원` : "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <h4 className="text-sm font-medium text-muted-foreground">설명</h4>
                        <p>{item.details?.description || "-"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                          item.current_quantity - historicalData.quantity > 0 ? "text-green-600" : 
                          item.current_quantity - historicalData.quantity < 0 ? "text-red-600" : 
                          "text-muted-foreground"
                        )}>
                          {item.current_quantity - historicalData.quantity > 0 ? "+" : ""}
                          {formatQuantity(item.current_quantity - historicalData.quantity, historicalData.unit)} {
                            historicalData.unit === "g" ? "kg" : 
                            historicalData.unit === "ml" ? "l" : 
                            historicalData.unit
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          조회 성능
                        </h4>
                        <div className="space-y-1">
                          <div className="text-sm flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {historicalData.calculationMethod === 'snapshot_direct' ? '스냅샷 직접' :
                               historicalData.calculationMethod === 'snapshot_incremental' ? '스냅샷+증분' :
                               '전체 계산'}
                            </Badge>
                            <span>{historicalData.calculationTime}</span>
                          </div>
                          {historicalData.transactionsProcessed > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {historicalData.transactionsProcessed}건 거래 처리
                            </p>
                          )}
                          {historicalData.baseSnapshot && (
                            <p className="text-xs text-muted-foreground">
                              기준: {format(new Date(historicalData.baseSnapshot.date), "MM/dd", { locale: ko })} 스냅샷
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDate && !historicalData && !isHistoricalLoading && (
                  <div className="text-center py-8 space-y-2">
                    <div className="text-muted-foreground">
                      📅 {format(new Date(selectedDate), 'yyyy년 MM월 dd일', { locale: ko })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      해당 날짜의 재고 데이터가 없습니다.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      재고 생성 이후의 날짜를 선택해주세요.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>최근 거래 내역</CardTitle>
                <CardDescription>이 항목의 최근 입출고 내역입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <StockTransactionTable
                  transactions={transactions}
                  pagination={pagination}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                  onRefresh={fetchTransactions}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
} 