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
  ClipboardList,
  RefreshCw,
} from "lucide-react";

// 재고 거래 타입 정의
export interface StockTransaction {
  id: string;
  transaction_type: "in" | "out" | "adjustment" | "verification";
  quantity: number;
  unit: string;
  created_at: string;
  notes?: string;
  status: "pending" | "approved" | "rejected" | "completed";
  created_by: {
    id: string;
    name: string;
  };
  stock_item: {
    id: string;
    item_type: string;
    details: {
      name: string;
      code_name?: string;
    };
  };
}

// 페이지네이션 정보 타입 정의
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface StockTransactionTableProps {
  transactions: StockTransaction[];
  pagination: PaginationInfo;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function StockTransactionTable({
  transactions,
  pagination,
  isLoading,
  onPageChange,
  onRefresh,
}: StockTransactionTableProps) {
  // 거래 유형에 따른 배지 렌더링
  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "in":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">입고</Badge>;
      case "out":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">출고</Badge>;
      case "adjustment":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">조정</Badge>;
      case "verification":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">실사</Badge>;
      default:
        return <Badge variant="outline">기타</Badge>;
    }
  };

  // 상태에 따른 배지 렌더링
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">대기중</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">승인됨</Badge>;
      case "rejected":
        return <Badge variant="destructive">거부됨</Badge>;
      case "completed":
        return <Badge variant="secondary">완료</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
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
            총 {pagination.total}개 거래
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead>
              <TableHead>항목</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>일시</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mb-2 text-muted-foreground/50" />
                    <p>거래 내역이 없습니다.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {getTransactionTypeBadge(transaction.transaction_type)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.stock_item.details.name}
                    {transaction.stock_item.details.code_name && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({transaction.stock_item.details.code_name})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.transaction_type === "out" ? "-" : ""}
                    {transaction.quantity} {transaction.unit}
                  </TableCell>
                  <TableCell>{formatDate(transaction.created_at)}</TableCell>
                  <TableCell>{transaction.created_by.name}</TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
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