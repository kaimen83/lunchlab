import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  ShoppingCart,
  Trash2,
  MinusCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStockCart, CartItem } from "./StockCartContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StockCartPanelProps {
  companyId: string;
  onProcessComplete?: () => void; // 처리 완료 시 콜백
}

export function StockCartPanel({ companyId, onProcessComplete }: StockCartPanelProps) {
  const {
    items,
    transactionType,
    setTransactionType,
    removeItem,
    updateQuantity,
    clearCart,
    processCart,
  } = useStockCart();
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 장바구니 처리 핸들러
  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const success = await processCart(notes, companyId);
      if (success && onProcessComplete) {
        onProcessComplete();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>재고 거래 생성</CardTitle>
            <CardDescription>한 개 이상의 항목을 입고 또는 출고합니다.</CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {items.length}개 항목
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 거래 유형 선택 */}
        <div>
          <Label>거래 유형</Label>
          <div className="flex gap-2 mt-1.5">
            <Button
              type="button"
              variant={transactionType === "in" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTransactionType("in")}
            >
              <ArrowDown className="mr-2 h-4 w-4" />
              입고
            </Button>
            <Button
              type="button"
              variant={transactionType === "out" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTransactionType("out")}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              출고
            </Button>
          </div>
        </div>

        {/* 장바구니가 비어있는 경우 */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-2 text-muted-foreground/50" />
            <p>장바구니가 비어있습니다</p>
            <p className="text-sm mt-1">테이블에서 항목을 추가해주세요</p>
          </div>
        )}

        {/* 장바구니 항목 목록 */}
        {items.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>장바구니 항목</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="h-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                비우기
              </Button>
            </div>
            <ScrollArea className="h-[200px] rounded-md border">
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <CartItemRow
                    key={item.stockItemId}
                    item={item}
                    onRemove={removeItem}
                    onQuantityChange={updateQuantity}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 메모 입력 */}
        <div className="space-y-2">
          <Label htmlFor="notes">메모</Label>
          <Textarea
            id="notes"
            placeholder="모든 항목에 적용될 메모를 입력하세요"
            className="resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          disabled={isProcessing || items.length === 0}
          className="w-full"
          onClick={handleProcess}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {items.length === 0
            ? "항목을 추가해주세요"
            : `${items.length}개 항목 ${
                transactionType === "in" ? "입고" : "출고"
              } 처리`}
        </Button>
      </CardFooter>
    </Card>
  );
}

// 장바구니 항목 행 컴포넌트
interface CartItemRowProps {
  item: CartItem;
  onRemove: (stockItemId: string) => void;
  onQuantityChange: (stockItemId: string, quantity: number) => void;
}

function CartItemRow({ item, onRemove, onQuantityChange }: CartItemRowProps) {
  return (
    <div className="flex items-start justify-between p-2 rounded-md border bg-background">
      <div className="flex-1 mr-2">
        <p className="font-medium text-sm">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          현재: {item.current_quantity} {item.unit}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={(e) =>
              onQuantityChange(item.stockItemId, parseFloat(e.target.value) || 0)
            }
            className="h-8 text-right"
          />
        </div>
        <span className="text-xs w-8">{item.unit}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.stockItemId)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <MinusCircle className="h-4 w-4" />
          <span className="sr-only">제거</span>
        </Button>
      </div>
    </div>
  );
} 