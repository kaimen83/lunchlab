"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StockFilter, StockFilterValues } from "@/components/stock/StockFilter";
import { StockItem, StockTable, PaginationInfo } from "@/components/stock/StockTable";
import { StockCartPanel } from "@/components/stock/StockCartPanel";
import { StockCartProvider } from "@/components/stock/StockCartContext";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface StockItemsPageProps {
  companyId: string;
}

export default function StockItemsPage({ companyId }: StockItemsPageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<StockItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    pageCount: 0,
  });
  const [filters, setFilters] = useState<StockFilterValues>({
    query: "",
    itemType: "container",
    category: "",
    stockGrade: "",
    sortBy: "name",
    sortOrder: "asc",
  });
  
  const shouldFetch = useRef(false);

  // 재고 항목 목록 조회
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.query) queryParams.set("query", filters.query);
      if (filters.itemType) queryParams.set("itemType", filters.itemType);
      if (filters.category) queryParams.set("category", filters.category);
      if (filters.stockGrade) queryParams.set("stockGrade", filters.stockGrade);
      if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
      if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

      const response = await fetch(
        `/api/companies/${companyId}/stock/items?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("재고 항목을 가져오는데 실패했습니다");
      }

      const data = await response.json();
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      console.error("재고 항목 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: "재고 항목을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, pagination.page, pagination.pageSize, filters, toast]);

  // 필터 변경 시 목록 다시 조회
  const handleFilterChange = useCallback((newFilters: StockFilterValues) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // 필터 변경 시 1페이지로 이동
    shouldFetch.current = true;
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
    shouldFetch.current = true;
  }, []);

  // 정렬 변경 핸들러
  const handleSort = useCallback((field: string) => {
    setFilters((prev) => {
      // 같은 필드를 다시 클릭하면 정렬 방향 변경
      const newSortOrder =
        prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc";
      return { ...prev, sortBy: field, sortOrder: newSortOrder };
    });
    shouldFetch.current = true;
  }, []);

  // 일괄 거래 완료 후 콜백
  const handleBulkProcessComplete = useCallback(() => {
    shouldFetch.current = true;
    fetchItems();
  }, [fetchItems]);

  // 상태 변경 시 데이터 다시 로딩
  useEffect(() => {
    // shouldFetch 플래그가 true일 때만 데이터를 가져옵니다
    if (shouldFetch.current) {
      fetchItems();
      shouldFetch.current = false;
    }
  }, [fetchItems]);

  // 컴포넌트 마운트 시 초기 데이터 로딩
  useEffect(() => {
    shouldFetch.current = true; // 초기 로딩 시 플래그 설정
    fetchItems();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StockCartProvider>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <StockFilter
            onFilterChange={handleFilterChange}
            defaultValues={filters}
          />
          <StockTable
            items={items}
            pagination={pagination}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortField={filters.sortBy || ""}
            sortOrder={filters.sortOrder || "asc"}
            companyId={companyId}
            onRefresh={() => { shouldFetch.current = true; fetchItems(); }}
            stockGrade={filters.stockGrade || ""}
            itemType={filters.itemType || ""}
          />
        </div>
        <div>
          <StockCartPanel
            companyId={companyId}
            onProcessComplete={handleBulkProcessComplete}
          />
        </div>
      </div>
    </StockCartProvider>
  );
} 