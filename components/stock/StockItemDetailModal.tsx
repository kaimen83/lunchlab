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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatQuantity } from "@/lib/utils/format";

interface StockItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  itemId: string | null;
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