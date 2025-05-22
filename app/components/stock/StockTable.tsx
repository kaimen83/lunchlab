import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// 재고 항목 타입 정의
export interface StockItem {
  id: string;
  item_type: "ingredient" | "container";
  current_quantity: number;
  unit: string;
  last_updated?: string;
  created_at: string;
  name: string;
  details: any;
}

// 페이지네이션 정보 타입 정의
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface StockTableProps {
  items: StockItem[];
  pagination: PaginationInfo;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: string;
  companyId: string;
  onRefresh: () => void;
}

export function StockTable({
  items,
  pagination,
  isLoading,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  companyId,
  onRefresh,
}: StockTableProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 항목 유형에 따른 배지 렌더링
  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case "ingredient":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">식자재</Badge>;
      case "container":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">용기</Badge>;
      default:
        return <Badge variant="outline">기타</Badge>;
    }
  };

  // 정렬 아이콘 렌더링
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  // 자동 동기화 실행 핸들러
  const handleSyncItems = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/stock/items/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "재고 항목 동기화에 실패했습니다");
      }

      const data = await response.json();
      
      toast({
        title: "재고 항목 동기화 완료",
        description: `${data.added}개의 새 항목이 추가되었습니다.`,
      });

      // 동기화 후 목록 새로고침
      onRefresh();
    } catch (error) {
      console.error("동기화 오류:", error);
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncItems}
            className="gap-1"
            disabled={isSyncing}
          >
            <RotateCw className="h-4 w-4" />
            {isSyncing ? "동기화 중..." : "자동 동기화"}
          </Button>
          <div className="text-sm text-muted-foreground">
            총 {pagination.total}개 항목
          </div>
        </div>
        <Link href={`/companies/${companyId}/stock/add`}>
          <Button size="sm">+ 새 항목 추가</Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort("name")}
              >
                <div className="flex items-center">
                  이름
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort("current_quantity")}
              >
                <div className="flex items-center">
                  수량
                  {getSortIcon("current_quantity")}
                </div>
              </TableHead>
              <TableHead>단위</TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort("last_updated")}
              >
                <div className="flex items-center">
                  최근 업데이트
                  {getSortIcon("last_updated")}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12 mb-2 text-muted-foreground/50" />
                    <p>재고 항목이 없습니다.</p>
                    <p className="text-xs mt-1">
                      상단의 '자동 동기화' 버튼을 클릭하여 식자재와 용기를 재고 항목으로 추가하세요.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{getItemTypeBadge(item.item_type)}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/companies/${companyId}/stock/items/${item.id}`} className="hover:underline">
                      {item.name}
                      {item.details.code_name && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({item.details.code_name})
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>{item.current_quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    {item.last_updated
                      ? formatDate(item.last_updated)
                      : formatDate(item.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {pagination.page} / {pagination.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
} 