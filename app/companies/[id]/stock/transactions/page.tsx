"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Search, X, Warehouse, Filter, RotateCcw, Package2, Calendar } from "lucide-react";
import WarehouseSelector from "@/components/stock/WarehouseSelector";

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
    warehouseId: "",
    itemName: "",
  });

  // 디바운싱을 위한 검색어 상태 분리
  const [searchQuery, setSearchQuery] = useState("");
  
  // 초기 마운트 상태를 추적하는 ref 추가
  const isInitialMount = useRef(true);

  // 거래 내역 목록 조회
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.transactionType && filters.transactionType !== "all") queryParams.set("transactionType", filters.transactionType);
      if (filters.stockItemId) queryParams.set("stockItemId", filters.stockItemId);
      if (filters.selectedDate) queryParams.set("selectedDate", filters.selectedDate);
      if (filters.warehouseId && filters.warehouseId !== "all") queryParams.set("warehouseId", filters.warehouseId);
      if (filters.itemName && filters.itemName.trim()) queryParams.set("itemName", filters.itemName.trim());

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
        duration: 1000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, pagination.page, filters]); // toast 제거로 불필요한 재생성 방지

  // 디바운싱된 검색 처리 - 초기 마운트 시에는 실행하지 않도록 수정
  useEffect(() => {
    // 초기 마운트 시에는 디바운싱 로직을 실행하지 않음
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, itemName: searchQuery }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500); // 500ms 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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
    setSearchQuery(""); // 검색어도 초기화
    setFilters({
      transactionType: "all",
      stockItemId: "",
      selectedDate: "",
      warehouseId: "",
      itemName: "",
    });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  // 초기 데이터 로딩 및 필터/페이지 변경 시 데이터 다시 로딩
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-4">
      {/* 컴팩트한 필터 영역 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* 검색 바 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="식자재명, 용기명 또는 코드명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 필터 컨트롤 */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 거래 유형 */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-700 min-w-fit">유형</Label>
            <Select
              value={filters.transactionType}
              onValueChange={(value) => handleFilterChange("transactionType", value)}
            >
              <SelectTrigger className="w-32 h-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="in">입고</SelectItem>
                <SelectItem value="out">출고</SelectItem>
                <SelectItem value="adjustment">조정</SelectItem>
                <SelectItem value="verification">재고실사</SelectItem>
                <SelectItem value="transfer">창고간 이동</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 창고 */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-700 min-w-fit">창고</Label>
            <WarehouseSelector
              companyId={companyId}
              selectedWarehouseId={filters.warehouseId || undefined}
              onWarehouseChange={(warehouseId) => 
                handleFilterChange("warehouseId", warehouseId || "all")
              }
              placeholder="전체"
              className="w-36"
              showAllOption={true}
            />
          </div>

          {/* 거래 날짜 */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-gray-700 min-w-fit">날짜</Label>
            <Input
              type="date"
              value={filters.selectedDate}
              onChange={handleDateChange}
              className="w-40 h-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* 초기화 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 px-4 text-sm text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800 transition-colors ml-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            초기화
          </Button>
        </div>
      </div>

      {/* 거래 내역 테이블 */}
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