"use client";

import { useState, useEffect, useCallback } from 'react';
import { StockTable } from '@/components/stock/StockTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Search, ClipboardCheck, ClipboardList, ShoppingCart, Plus, Package, Utensils, Filter, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StockCartProvider, useStockCart } from '@/components/stock/StockCartContext';
import { StockTransactionModal } from '@/components/stock/StockTransactionModal';
import WarehouseSelector from '@/components/stock/WarehouseSelector';
import StockAuditPage from './audit/page';
import StockTransactionsPage from './transactions/page';

// 창고 정보 타입 정의
interface Warehouse {
  id: string;
  name: string;
}

interface StockItem {
  id: string;
  item_type: 'ingredient' | 'container';
  current_quantity: number;
  unit: string;
  last_updated: string;
  created_at: string;
  name: string;
  details?: {
    id: string;
    name: string;
    code_name?: string;
    price?: number;
    [key: string]: any;
  };
  warehouseStocks?: { [warehouseId: string]: any }; // 창고별 재고 정보
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface StockClientProps {
  companyId: string;
}

// 내부 컴포넌트 - StockCartProvider 내부에서 실행
function StockClientInner({ companyId }: StockClientProps) {
  const { clearCart } = useStockCart();
  
  // 상태 관리
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]); // 창고 목록 상태 추가
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    pageCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [itemType, setItemType] = useState<string>('');
  const [stockGrade, setStockGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(undefined);

  // 재고 데이터 가져오기
  const fetchStockItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (itemType) params.append('itemType', itemType);
      if (stockGrade && stockGrade !== 'all') params.append('stockGrade', stockGrade);
      if (searchQuery) params.append('query', searchQuery);
      // 창고 필터링을 제거하여 항상 모든 창고의 데이터를 가져옴
      // if (selectedWarehouseId) params.append('warehouse_id', selectedWarehouseId);

      const response = await fetch(
        `/api/companies/${companyId}/stock/items?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('재고 데이터를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      
      setItems(data.items || []);
      setWarehouses(data.warehouses || []); // 창고 정보 설정
      setPagination(data.pagination || {
        total: 0,
        page: 1,
        pageSize: 10,
        pageCount: 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, pagination.page, pagination.pageSize, itemType, stockGrade, searchQuery, sortBy, sortOrder]);

  // 초기 데이터 로드 및 의존성 변경 시 재로드
  useEffect(() => {
    fetchStockItems();
  }, [fetchStockItems]);

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 정렬 변경 핸들러
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 })); // 정렬 변경 시 첫 페이지로 이동
  };

  // 필터 변경 핸들러들
  const handleItemTypeChange = (value: string) => {
    const actualValue = value === 'all' ? '' : value;
    setItemType(actualValue);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStockGradeChange = (value: string) => {
    setStockGrade(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleWarehouseChange = (warehouseId: string | undefined) => {
    setSelectedWarehouseId(warehouseId);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    fetchStockItems();
  };

  // 모달 상태
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // 표시할 창고 목록 결정 (선택된 창고가 있으면 해당 창고만, 없으면 전체)
  const displayWarehouses = selectedWarehouseId 
    ? warehouses.filter(w => w.id === selectedWarehouseId)
    : warehouses;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">재고 관리</h1>
          <p className="text-muted-foreground">
            회사의 식자재와 용기 재고를 관리하세요.
          </p>
        </div>
        <Button 
          onClick={() => setIsTransactionModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          재고 거래 생성
        </Button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 메인 컨텐츠 */}
      <div className="w-full">
        {/* 재고 목록 */}
        <div className="w-full">
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">재고 목록</TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                재고 실사
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                거래 내역
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {/* 검색 및 필터 */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {/* 검색 바 */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="항목명, 코드명 검색..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* 필터 컨트롤 */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* 창고 선택 */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-gray-700 min-w-fit">창고</Label>
                    <WarehouseSelector
                      companyId={companyId}
                      selectedWarehouseId={selectedWarehouseId}
                      onWarehouseChange={handleWarehouseChange}
                      placeholder="전체"
                      className="w-36"
                    />
                  </div>

                  {/* 항목 타입 */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-gray-700 min-w-fit">타입</Label>
                    <div className="flex bg-gray-50 border border-gray-300 rounded-md overflow-hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemTypeChange('all')}
                        className={`h-9 px-4 text-sm rounded-none border-0 font-medium transition-colors ${
                          itemType === '' 
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        전체
                      </Button>
                      <div className="w-px bg-gray-300"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemTypeChange('ingredient')}
                        className={`h-9 px-4 text-sm rounded-none border-0 font-medium transition-colors ${
                          itemType === 'ingredient' 
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Utensils className="h-4 w-4 mr-2" />
                        식자재
                      </Button>
                      <div className="w-px bg-gray-300"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemTypeChange('container')}
                        className={`h-9 px-4 text-sm rounded-none border-0 font-medium transition-colors ${
                          itemType === 'container' 
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        용기
                      </Button>
                    </div>
                  </div>

                  {/* 재고 등급 */}
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium text-gray-700 min-w-fit">등급</Label>
                    <Select value={stockGrade} onValueChange={handleStockGradeChange}>
                      <SelectTrigger className="w-28 h-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="A">A등급</SelectItem>
                        <SelectItem value="B">B등급</SelectItem>
                        <SelectItem value="C">C등급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 초기화 버튼 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setItemType('');
                      setStockGrade('all');
                      setSearchQuery('');
                      setSelectedWarehouseId(undefined);
                      clearCart();
                    }}
                    className="h-9 px-4 text-sm text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800 transition-colors ml-auto"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>

              {/* 재고 테이블 */}
              <StockTable
                items={items}
                warehouses={displayWarehouses} // 선택된 창고에 따라 표시할 창고 목록 전달
                pagination={pagination}
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onSort={handleSort}
                sortField={sortBy}
                sortOrder={sortOrder}
                companyId={companyId}
                onRefresh={handleRefresh}
                stockGrade={stockGrade}
                itemType={itemType}
              />
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <StockAuditPage 
                companyId={companyId}
                selectedWarehouseId={selectedWarehouseId}
              />
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <StockTransactionsPage 
                companyId={companyId}
                selectedWarehouseId={selectedWarehouseId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 재고 거래 모달 */}
      <StockTransactionModal
        open={isTransactionModalOpen}
        onOpenChange={setIsTransactionModalOpen}
        companyId={companyId}
        onTransactionComplete={handleRefresh}
      />
    </div>
  );
}

export default function StockClient({ companyId }: StockClientProps) {
  return (
    <StockCartProvider>
      <StockClientInner companyId={companyId} />
    </StockCartProvider>
  );
} 