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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
    startDate: "",
    endDate: "",
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
      if (filters.startDate) queryParams.set("startDate", filters.startDate);
      if (filters.endDate) queryParams.set("endDate", filters.endDate);

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

  // 날짜 필터 변경 핸들러
  const handleDateChange = (name: string, date: Date | undefined) => {
    if (!date) {
      handleFilterChange(name, "");
      return;
    }
    
    const formattedDate = date.toISOString().split("T")[0];
    handleFilterChange(name, formattedDate);
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    setFilters({
      transactionType: "all",
      stockItemId: "",
      startDate: "",
      endDate: "",
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
        <div className="grid gap-4 md:grid-cols-4">
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
            <Label>시작일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? (
                    format(new Date(filters.startDate), "PPP", { locale: ko })
                  ) : (
                    <span>시작일 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  locale={ko}
                  selected={filters.startDate ? new Date(filters.startDate) : undefined}
                  onSelect={(date) => handleDateChange("startDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>종료일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? (
                    format(new Date(filters.endDate), "PPP", { locale: ko })
                  ) : (
                    <span>종료일 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  locale={ko}
                  selected={filters.endDate ? new Date(filters.endDate) : undefined}
                  onSelect={(date) => handleDateChange("endDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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