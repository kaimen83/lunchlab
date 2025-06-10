"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StockTransaction, StockTransactionTable, PaginationInfo } from "@/components/stock/StockTransactionTable";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface StockTransactionsPageProps {
  companyId: string;
}

export default function StockTransactionsPage({ companyId }: StockTransactionsPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    pageCount: 0,
  });
  const [filters, setFilters] = useState({
    transactionType: "all",
    stockItemId: "",
    selectedDate: "",
  });

  // 거래 내역 목록 조회
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.transactionType && filters.transactionType !== "all") queryParams.set("transactionType", filters.transactionType);
      if (filters.stockItemId) queryParams.set("stockItemId", filters.stockItemId);
      if (filters.selectedDate) queryParams.set("selectedDate", filters.selectedDate);

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
    } finally {
      setIsLoading(false);
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // 필터 변경 시 1페이지로 이동
  };

  // 날짜 필터 변경 핸들러 - HTML5 date input 사용
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = event.target.value; // YYYY-MM-DD 형식으로 자동 반환
    handleFilterChange("selectedDate", selectedDate);
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setFilters({
      transactionType: "all",
      stockItemId: "",
      selectedDate: "",
    });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // 초기 데이터 로딩 및 필터/페이지 변경 시 데이터 다시 로딩
  useEffect(() => {
    fetchTransactions();
  }, [companyId, pagination.page, filters]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="transactionType">거래 유형</Label>
            <Select
              value={filters.transactionType}
              onValueChange={(value) => handleFilterChange("transactionType", value)}
            >
              <SelectTrigger id="transactionType">
                <SelectValue placeholder="모든 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="in">입고</SelectItem>
                <SelectItem value="out">출고</SelectItem>
                <SelectItem value="adjustment">조정</SelectItem>
                <SelectItem value="verification">재고실사</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selectedDate">거래 날짜</Label>
            <Input
              id="selectedDate"
              type="date"
              value={filters.selectedDate}
              onChange={handleDateChange}
              className="w-full"
              placeholder="날짜를 선택하세요"
            />
          </div>

          <div className="flex items-end space-x-2">
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              초기화
            </Button>
            <Button
              onClick={fetchTransactions}
              className="flex items-center gap-1"
            >
              <Search className="h-4 w-4" />
              검색
            </Button>
          </div>
        </div>
      </Card>

      <StockTransactionTable
        transactions={transactions}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onRefresh={fetchTransactions}
      />
    </div>
  );
} 