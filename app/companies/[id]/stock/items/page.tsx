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
  selectedItemType?: "ingredient" | "container";
}

export default function StockItemsPage({ companyId, selectedItemType = "ingredient" }: StockItemsPageProps) {
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
    itemType: selectedItemType,
    category: "all",
    stockGrade: "all",
    sortBy: "name",
    sortOrder: "asc",
  });
  
  const shouldFetch = useRef(false);
  const isInitialized = useRef(false);

  // 상위 컴포넌트에서 selectedItemType이 변경되면 필터 업데이트
  useEffect(() => {
    if (filters.itemType !== selectedItemType) {
      setFilters(prev => ({ ...prev, itemType: selectedItemType }));
      setPagination(prev => ({ ...prev, page: 1 })); // 필터 변경 시 1페이지로 이동
      shouldFetch.current = true;
    }
  }, [selectedItemType]);

  // 상태를 localStorage에 저장하는 함수
  const saveStateToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stateToSave = {
        filters,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize
        }
      };
      localStorage.setItem(`stock-list-state-${companyId}`, JSON.stringify(stateToSave));
    }
  }, [filters, pagination.page, pagination.pageSize, companyId]);

  // localStorage에서 상태를 불러오는 함수
  const loadStateFromLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined' && !isInitialized.current) {
      const savedState = localStorage.getItem(`stock-list-state-${companyId}`);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.filters) {
            // selectedItemType이 있으면 우선 적용
            const itemType = selectedItemType || parsedState.filters.itemType || "ingredient";
            setFilters({
              ...parsedState.filters,
              itemType,
              // 빈 문자열을 'all'로 변환
              category: parsedState.filters.category === '' ? 'all' : parsedState.filters.category || 'all',
              stockGrade: parsedState.filters.stockGrade === '' ? 'all' : parsedState.filters.stockGrade || 'all'
            });
          }
          if (parsedState.pagination) {
            setPagination(prev => ({
              ...prev,
              page: parsedState.pagination.page || 1,
              pageSize: parsedState.pagination.pageSize || 10
            }));
          }
          shouldFetch.current = true;
        } catch (error) {
          console.error('상태 복원 중 오류 발생:', error);
        }
      }
      isInitialized.current = true;
    }
  }, [companyId, selectedItemType]);

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
      if (filters.category && filters.category !== 'all') queryParams.set("category", filters.category);
      if (filters.stockGrade && filters.stockGrade !== 'all') queryParams.set("stockGrade", filters.stockGrade);
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
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pageCount: data.pagination.pageCount
      }));
      
      // 데이터를 가져온 후 상태 저장
      saveStateToLocalStorage();
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
  }, [companyId, pagination.page, pagination.pageSize, filters, toast, saveStateToLocalStorage]);

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

  // 컴포넌트 마운트 시 localStorage에서 상태 불러오기 및 초기 데이터 로딩
  useEffect(() => {
    loadStateFromLocalStorage(); // 먼저 저장된 상태 불러오기
    if (!shouldFetch.current) { // 상태 복원 후에도 fetch 필요하면 실행
      shouldFetch.current = true;
      fetchItems();
    }
  }, [companyId, loadStateFromLocalStorage, fetchItems]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StockCartProvider>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <StockFilter
            onFilterChange={handleFilterChange}
            defaultValues={{
              ...filters,
              itemType: selectedItemType // 선택된 항목 유형을 StockFilter에 전달
            }}
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