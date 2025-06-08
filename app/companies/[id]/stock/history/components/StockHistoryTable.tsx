"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatQuantity } from "@/lib/utils/format";
import type { StockItemAtDate } from "@/types/stock";

interface StockHistoryTableProps {
  items: StockItemAtDate[];
  currentStockData: any[];
  targetDate: string;
  getStockChange: (item: StockItemAtDate) => { change: number; percentage: string | null } | null;
}

export function StockHistoryTable({
  items,
  currentStockData,
  targetDate,
  getStockChange,
}: StockHistoryTableProps) {
  // 변화량 아이콘 렌더링
  const renderChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // 항목 타입에 따른 배지
  const getItemTypeBadge = (type: string) => {
    if (type === "ingredient") {
      return <Badge variant="default">식자재</Badge>;
    } else {
      return <Badge variant="secondary">용기</Badge>;
    }
  };

  // 재고 상태에 따른 배지
  const getQuantityBadge = (quantity: number) => {
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

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">타입</TableHead>
              <TableHead className="w-[200px]">항목명</TableHead>
              <TableHead className="w-[120px]">코드명</TableHead>
              <TableHead className="w-[120px]">카테고리</TableHead>
              <TableHead className="w-[120px]">{targetDate} 재고</TableHead>
              <TableHead className="w-[100px]">상태</TableHead>
              <TableHead className="w-[120px]">현재 재고</TableHead>
              <TableHead className="w-[120px]">변화량</TableHead>
              <TableHead className="w-[100px]">변화율</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stockChange = getStockChange(item);
              const currentItem = currentStockData.find(current => 
                current.item_id === item.details.id && 
                current.item_type === item.item_type
              );

              return (
                <TableRow key={item.stock_item_id} className="hover:bg-muted/50">
                  <TableCell>
                    {getItemTypeBadge(item.item_type)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{item.item_name}</div>
                      {item.details.code_name && (
                        <div className="text-xs text-muted-foreground">
                          {item.details.code_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.details.code_name || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.details.category || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatQuantity(item.quantity, item.unit)} {item.unit}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {targetDate} 기준
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getQuantityBadge(item.quantity)}
                  </TableCell>
                  <TableCell>
                    {currentItem ? (
                      <span className="font-medium">
                        {formatQuantity(currentItem.current_quantity, currentItem.unit)} {currentItem.unit}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stockChange ? (
                      <div className="flex items-center gap-2">
                        {renderChangeIcon(stockChange.change)}
                        <span className={`text-sm font-medium ${
                          stockChange.change > 0 ? 'text-green-600' : 
                          stockChange.change < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {stockChange.change > 0 ? '+' : ''}{formatQuantity(stockChange.change, item.unit)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stockChange?.percentage ? (
                      <span className={`text-sm ${
                        stockChange.change > 0 ? 'text-green-600' : 
                        stockChange.change < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {stockChange.change > 0 ? '+' : ''}{stockChange.percentage}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 