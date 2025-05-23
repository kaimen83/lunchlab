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
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useStockCart } from "./StockCartContext";
import { StockItemDetailModal } from "./StockItemDetailModal";

// 재고 항목 타입 정의
export interface StockItem {
  id: string;
  item_type: "ingredient" | "container";
  current_quantity: number;
  unit: string;
  last_updated: string;
  created_at: string;
  name: string; // API 응답에서 직접 제공하는 이름 필드
  details?: {
    id: string;
    name: string;
    code_name?: string;
    price?: number; // 단가 정보 추가
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
  stockGrade: string;
  itemType: string;
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
  stockGrade,
  itemType,
}: StockTableProps) {
  // 장바구니 컨텍스트 사용
  const { addItem } = useStockCart();
  
  // 선택된 항목과 모달 상태 관리
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 항목 클릭 핸들러
  const handleItemClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  };

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
    
    if (quantity < 0) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">초과출고</Badge>;
    } else if (quantity === 0) {
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

  // 금액 포맷팅 함수
  const formatPrice = (price: number | undefined) => {
    if (price === null || price === undefined) return "-";
    return price.toLocaleString('ko-KR') + "원";
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
                <TableHead className="w-[80px]">
                  <Skeleton className="h-4 w-8" />
                </TableHead>
                <TableHead className="w-[200px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[100px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[180px]">
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead className="w-[60px] text-right">
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
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 ml-auto" />
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
          {stockGrade && stockGrade !== "all" && itemType === "ingredient" && (
            <Badge variant="secondary" className="ml-2">
              재고등급: {stockGrade}
            </Badge>
          )}
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
              <TableHead className="w-[80px]">유형</TableHead>
              <TableHead className="w-[200px]">
                <button
                  onClick={() => onSort("name")}
                  className="inline-flex items-center hover:text-primary"
                >
                  항목명 {sortIcon("name")}
                </button>
              </TableHead>
              <TableHead className="w-[100px]">
                <button
                  onClick={() => onSort("code_name")}
                  className="inline-flex items-center hover:text-primary"
                >
                  코드 {sortIcon("code_name")}
                </button>
              </TableHead>
              <TableHead className="w-[100px]">
                <button
                  onClick={() => onSort("current_quantity")}
                  className="inline-flex items-center hover:text-primary"
                >
                  수량 {sortIcon("current_quantity")}
                </button>
              </TableHead>
              <TableHead className="w-[100px]">단가</TableHead>
              <TableHead className="w-[100px]">재고액</TableHead>
              <TableHead className="w-[180px]">
                <button
                  onClick={() => onSort("last_updated")}
                  className="inline-flex items-center hover:text-primary"
                >
                  최종 업데이트 {sortIcon("last_updated")}
                </button>
              </TableHead>
              <TableHead className="text-right">장바구니</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12 mb-2" />
                    <p>재고 항목이 없습니다.</p>
                    <p className="text-xs">
                      위의 &quot;새 항목 추가&quot; 버튼을 클릭하여 재고 항목을 추가하세요.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                // 임시 항목인지 확인
                const isTemporary = item.id.startsWith("temp_");
                
                // 단가와 재고액 계산
                const price = item.details?.price;
                let totalValue;
                
                if (item.item_type === "ingredient" && item.details?.package_amount) {
                  // 식자재: 수량÷포장단위×단가
                  const packageAmount = item.details.package_amount;
                  totalValue = price && item.current_quantity !== undefined && packageAmount > 0
                    ? (item.current_quantity / packageAmount) * price
                    : undefined;
                } else {
                  // 용기: 단가×수량
                  totalValue = price && item.current_quantity !== undefined
                    ? price * item.current_quantity
                    : undefined;
                }
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>{getItemTypeBadge(item.item_type)}</TableCell>
                    <TableCell>
                      {isTemporary ? (
                        <span className="cursor-not-allowed">{item.name}</span>
                      ) : (
                        <button
                          onClick={() => handleItemClick(item.id)}
                          className="hover:underline flex items-center text-left"
                        >
                          {item.name}
                          <ExternalLink className="h-3 w-3 ml-1 text-muted-foreground" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.details?.code_name || "-"}
                    </TableCell>
                    <TableCell>{item.current_quantity} {item.unit}</TableCell>
                    <TableCell>{formatPrice(price)}</TableCell>
                    <TableCell>{formatPrice(totalValue)}</TableCell>
                    <TableCell>
                      {formatDate(item.last_updated || item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => addItem(item)}
                        title="장바구니 추가"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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
            disabled={pagination.page <= 1}
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
            disabled={pagination.page >= pagination.pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* 재고 항목 상세 모달 */}
      <StockItemDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        companyId={companyId}
        itemId={selectedItemId}
      />
    </div>
  );
} 