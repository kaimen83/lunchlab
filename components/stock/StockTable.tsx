import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Package,
  PlusCircle,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// 재고 항목 타입 정의
export interface StockItem {
  id: string;
  item_type: "ingredient" | "container";
  current_quantity: number;
  unit: string;
  last_updated: string;
  created_at: string;
  details: {
    id: string;
    name: string;
    code_name?: string;
    [key: string]: any;
  };
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
  sortOrder: "asc" | "desc";
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
  const sortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ChevronLeft className="ml-2 h-4 w-4" />
    ) : (
      <ChevronRight className="ml-2 h-4 w-4" />
    );
  };

  // 재고 상태에 따른 배지 색상 결정
  const getQuantityBadge = (item: StockItem) => {
    const quantity = item.current_quantity;
    
    if (quantity <= 0) {
      return <Badge variant="destructive">품절</Badge>;
    } else if (quantity < 10) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">부족</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">충분</Badge>;
    }
  };

  // 항목 타입에 따른 표시 설정
  const getItemTypeBadge = (type: string) => {
    if (type === "ingredient") {
      return <Badge variant="secondary">식자재</Badge>;
    } else {
      return <Badge variant="outline">용기</Badge>;
    }
  };
  
  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Skeleton className="h-4 w-8" />
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
                <TableHead className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-6 w-6" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-20 ml-auto" />
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
          <div className="text-sm text-muted-foreground">
            총 {pagination.total}개 항목
          </div>
        </div>

        <Button asChild size="sm">
          <Link href={`/companies/${companyId}/stock/add`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            새 항목 추가
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">유형</TableHead>
              <TableHead>
                <button
                  onClick={() => onSort("name")}
                  className="inline-flex items-center hover:text-primary"
                >
                  항목명 {sortIcon("name")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => onSort("current_quantity")}
                  className="inline-flex items-center hover:text-primary"
                >
                  수량 {sortIcon("current_quantity")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => onSort("last_updated")}
                  className="inline-flex items-center hover:text-primary"
                >
                  최종 업데이트 {sortIcon("last_updated")}
                </button>
              </TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12 mb-2 text-muted-foreground/50" />
                    <p>등록된 재고 항목이 없습니다.</p>
                    <Button asChild variant="link" className="mt-2">
                      <Link href={`/companies/${companyId}/stock/add`}>
                        새 항목 추가하기
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{getItemTypeBadge(item.item_type)}</TableCell>
                  <TableCell className="font-medium">
                    {item.details.name}
                    {item.details.code_name && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.details.code_name})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.current_quantity} {item.unit}
                  </TableCell>
                  <TableCell>{formatDate(item.last_updated)}</TableCell>
                  <TableCell>{getQuantityBadge(item)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Link href={`/companies/${companyId}/stock/items/${item.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">상세 보기</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            이전
          </Button>
          <span className="text-sm">
            {pagination.page} / {pagination.pageCount} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pageCount}
          >
            다음
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
} 