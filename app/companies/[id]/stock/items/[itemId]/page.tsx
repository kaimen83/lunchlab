"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from 'react';
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
  ArrowLeft,
  Package,
  ArrowUp,
  ArrowDown,
  Edit,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatQuantity } from "@/lib/utils/format";

interface StockItemDetailProps {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

export default function StockItemDetailPage({ params }: StockItemDetailProps) {
  const resolvedParams = use(params);
  const { id: companyId, itemId } = resolvedParams;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 5,
    pageCount: 0,
  });
  const [transactionData, setTransactionData] = useState({
    type: "in",
    quantity: 1,
    notes: "",
  });

  // 재고 항목 상세 정보 조회
  const fetchItemDetail = async () => {
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

  // 거래 생성 핸들러
  const handleCreateTransaction = async () => {
    setIsTransacting(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stockItemId: itemId,
            transactionType: transactionData.type,
            quantity: transactionData.quantity,
            notes: transactionData.notes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "거래 생성에 실패했습니다");
      }

      toast({
        title: "거래가 생성되었습니다",
        description: `${transactionData.type === "in" ? "입고" : "출고"} 거래가 성공적으로 처리되었습니다.`,
      });

      // 거래 처리 후 재고 정보 및 거래 내역 갱신
      await fetchItemDetail();
      await fetchTransactions();

      // 폼 초기화
      setTransactionData({
        type: "in",
        quantity: 1,
        notes: "",
      });
    } catch (error) {
      console.error("거래 생성 오류:", error);
      toast({
        title: "거래 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsTransacting(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // 초기 데이터 로딩
  useEffect(() => {
    fetchItemDetail();
  }, [companyId, itemId]);

  // 재고 항목 로딩 후 거래 내역 로딩
  useEffect(() => {
    if (item) {
      fetchTransactions();
    }
  }, [item, pagination.page]);

  // 로딩 중 상태 표시
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 항목이 없는 경우
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold mb-2">재고 항목을 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">요청하신 재고 항목이 존재하지 않거나 접근 권한이 없습니다.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>
      </div>
    );
  }

  // 재고 상태에 따른 배지 생성
  const getQuantityBadge = () => {
    const quantity = item.current_quantity;
    
    if (quantity <= 0) {
      return <Badge variant="destructive" className="text-base py-1 px-3">품절</Badge>;
    } else if (quantity < 10) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-base py-1 px-3">부족</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-base py-1 px-3">충분</Badge>;
    }
  };

  // 항목 유형에 따른 표시 설정
  const getItemTypeBadge = (type: string) => {
    if (type === "ingredient") {
      return <Badge variant="secondary" className="mr-2">식자재</Badge>;
    } else {
      return <Badge variant="outline" className="mr-2">용기</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            뒤로
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            {getItemTypeBadge(item.item_type)}
            {item.details?.name || "재고 항목"}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchItemDetail}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
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
                    <span className="text-xl font-semibold mr-2">
                      {formatQuantity(item.current_quantity, item.unit)} {item.unit}
                    </span>
                    {getQuantityBadge()}
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

        <div>
          <Card>
            <CardHeader>
              <CardTitle>빠른 거래 생성</CardTitle>
              <CardDescription>
                이 항목의 입고 또는 출고 거래를 생성합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transactionData.type === "in" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTransactionData({ ...transactionData, type: "in" })}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  입고
                </Button>
                <Button
                  type="button"
                  variant={transactionData.type === "out" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setTransactionData({ ...transactionData, type: "out" })}
                >
                  <ArrowUp className="mr-2 h-4 w-4" />
                  출고
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">수량</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionData.quantity}
                    onChange={(e) =>
                      setTransactionData({
                        ...transactionData,
                        quantity: parseFloat(e.target.value),
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground w-10">
                    {item.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  placeholder="거래에 대한 추가 정보를 입력하세요"
                  className="resize-none"
                  value={transactionData.notes}
                  onChange={(e) =>
                    setTransactionData({
                      ...transactionData,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleCreateTransaction}
                disabled={isTransacting}
                className="w-full"
              >
                {isTransacting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                거래 생성
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 