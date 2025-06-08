"use client";

import { useState, useEffect } from "react";
import { Calendar, Search, Package, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatQuantity } from "@/lib/utils/format";
import type { StockAtDateResponse, StockItemAtDate } from "@/types/stock";
import { StockHistoryTable } from "./components/StockHistoryTable";

interface StockHistoryPageProps {
  companyId: string;
}

export default function StockHistoryPage({ companyId }: StockHistoryPageProps) {
  // 어제 날짜 계산 함수
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const [targetDate, setTargetDate] = useState(() => {
    // 기본값: 어제 날짜
    return getYesterday();
  });
  const [stockData, setStockData] = useState<StockAtDateResponse | null>(null);
  const [currentStockData, setCurrentStockData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // 현재 재고 데이터 조회
  useEffect(() => {
    fetchCurrentStock();
  }, [companyId]);

  // 특정 날짜 재고 조회
  const fetchStockAtDate = async () => {
    if (!targetDate) {
      toast({
        title: "오류",
        description: "날짜를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/at-date?targetDate=${targetDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '재고 조회에 실패했습니다.');
      }

      const data: StockAtDateResponse = await response.json();
      setStockData(data);

      toast({
        title: "조회 완료",
        description: `${targetDate} 기준 재고량을 조회했습니다.`,
      });
    } catch (error) {
      console.error('Stock at date fetch error:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : '재고 조회 중 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 재고 조회
  const fetchCurrentStock = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/stock/items`);
      if (!response.ok) return;

      const data = await response.json();
      setCurrentStockData(data.items || []);
    } catch (error) {
      console.error('Current stock fetch error:', error);
    }
  };

  // 검색 필터링
  const filteredItems = stockData?.items.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.details.code_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // 재고 변화량 계산
  const getStockChange = (historicalItem: StockItemAtDate) => {
    const currentItem = currentStockData.find(current => 
      current.item_id === historicalItem.details.id && 
      current.item_type === historicalItem.item_type
    );

    if (!currentItem) return null;

    const change = currentItem.current_quantity - historicalItem.quantity;
    return {
      change,
      percentage: historicalItem.quantity > 0 
        ? ((change / historicalItem.quantity) * 100).toFixed(1)
        : null
    };
  };

  // 변화량 아이콘 렌더링
  const renderChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // 계산 방법 배지 렌더링
  const getCalculationMethodBadge = (method: string) => {
    switch (method) {
      case 'snapshot':
        return <Badge variant="secondary">스냅샷</Badge>;
      case 'realtime':
        return <Badge variant="outline">실시간</Badge>;
      case 'hybrid':
        return <Badge variant="default">하이브리드</Badge>;
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">재고 이력 조회</h2>
          <p className="text-muted-foreground">
            특정 날짜의 재고량을 조회하고 현재와 비교할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 조회 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            날짜별 재고 조회
          </CardTitle>
          <CardDescription>
            조회하고 싶은 날짜를 선택하고 검색 버튼을 클릭하세요. (오늘 날짜는 선택할 수 없습니다)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="targetDate">조회 날짜</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                max={getYesterday()}
              />
            </div>
            <Button 
              onClick={fetchStockAtDate} 
              disabled={isLoading || !targetDate}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "조회 중..." : "재고 조회"}
            </Button>
          </div>

          {stockData && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>계산 방법: {getCalculationMethodBadge(stockData.calculationMethod)}</span>
              {stockData.snapshotDate && (
                <span>스냅샷 기준일: {stockData.snapshotDate}</span>
              )}
              <span>조회된 항목: {stockData.items.length}개</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 검색 */}
      {stockData && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="항목명 또는 코드로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredItems.length}개 항목 표시
          </div>
        </div>
      )}

      {/* 재고 데이터 표시 - 테이블 형태 */}
      {stockData && !isLoading && (
        <StockHistoryTable
          items={filteredItems}
          currentStockData={currentStockData}
          targetDate={targetDate}
          getStockChange={getStockChange}
        />
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array(5).fill(0).map((_, idx) => (
                <div key={idx} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 없음 */}
      {stockData && !isLoading && filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              재고 데이터가 없습니다
            </h3>
            <p className="text-gray-500 text-center">
              {searchQuery 
                ? "검색 조건에 맞는 재고 항목이 없습니다." 
                : "해당 날짜에 재고 데이터가 없습니다."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 