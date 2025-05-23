'use client';

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
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  ShoppingCart,
  Trash2,
  X,
  CalendarIcon,
  FileText,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStockCart, CartItem } from "./StockCartContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CookingPlanImportModal } from "./CookingPlanImportModal";
import { cn } from "@/lib/utils";

interface StockCartPanelProps {
  companyId: string;
  onProcessComplete?: () => void;
}

export function StockCartPanel({ companyId, onProcessComplete }: StockCartPanelProps) {
  const {
    items,
    transactionType,
    transactionDate,
    setTransactionType,
    setTransactionDate,
    removeItem,
    updateQuantity,
    clearCart,
    processCart,
  } = useStockCart();
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCookingPlanModalOpen, setIsCookingPlanModalOpen] = useState(false);

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

  // 조리계획서 불러오기 완료 핸들러
  const handleCookingPlanImportComplete = () => {
    if (onProcessComplete) {
      onProcessComplete();
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">재고 거래 생성</CardTitle>
              <CardDescription>
                재고 항목을 선택하여 입고 또는 출고 거래를 생성합니다
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {items.length}개 항목
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 빠른 불러오기 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">빠른 불러오기</Label>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsCookingPlanModalOpen(true)}
              className="w-full justify-start gap-2 h-10"
            >
              <FileText className="h-4 w-4" />
              조리계획서에서 불러오기
              <Badge variant="secondary" className="ml-auto text-xs">
                자동 계산
              </Badge>
            </Button>
          </div>

          <Separator />

          {/* 거래 설정 섹션 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">거래 설정</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 거래 유형 */}
              <div className="space-y-2">
                <Label className="text-sm">거래 유형</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={transactionType === "in" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTransactionType("in")}
                    className="justify-center"
                  >
                    <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
                    입고
                  </Button>
                  <Button
                    type="button"
                    variant={transactionType === "out" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTransactionType("out")}
                    className="justify-center"
                  >
                    <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
                    출고
                  </Button>
                </div>
              </div>

              {/* 거래 날짜 */}
              <div className="space-y-2">
                <Label className="text-sm">거래 날짜</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {transactionDate ? (
                        format(transactionDate, "MM/dd", { locale: ko })
                      ) : (
                        "날짜 선택"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => date && setTransactionDate(date)}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* 선택된 항목 섹션 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">선택된 항목</Label>
                {items.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {items.length}개
                  </Badge>
                )}
              </div>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  전체 삭제
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-lg">
                <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground font-medium">
                  선택된 항목이 없습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  재고 테이블에서 항목을 추가하거나 조리계획서를 불러와 주세요
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <ScrollArea className="max-h-[240px]">
                  <div className="p-3 space-y-2">
                    {items.map((item, index) => (
                      <CartItemRow
                        key={item.stockItemId}
                        item={item}
                        onRemove={removeItem}
                        onQuantityChange={updateQuantity}
                        isLast={index === items.length - 1}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* 메모 섹션 */}
          {items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">메모 (선택사항)</Label>
                <Textarea
                  placeholder="거래에 대한 추가 정보를 입력하세요"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none h-20 text-sm"
                />
              </div>
            </>
          )}
        </CardContent>

        {/* 실행 버튼 */}
        {items.length > 0 && (
          <CardFooter className="pt-4">
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full h-11"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  {transactionType === "in" ? (
                    <ArrowDown className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  {items.length}개 항목 {transactionType === "in" ? "입고" : "출고"} 처리
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* 조리계획서 불러오기 모달 */}
      <CookingPlanImportModal
        open={isCookingPlanModalOpen}
        onOpenChange={setIsCookingPlanModalOpen}
        companyId={companyId}
        onImportComplete={handleCookingPlanImportComplete}
      />
    </>
  );
}

// 개선된 장바구니 항목 행 컴포넌트
interface CartItemRowProps {
  item: CartItem;
  onRemove: (stockItemId: string) => void;
  onQuantityChange: (stockItemId: string, quantity: number) => void;
  isLast?: boolean;
}

function CartItemRow({ item, onRemove, onQuantityChange, isLast }: CartItemRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-md bg-muted/30 border",
      !isLast && "mb-2"
    )}>
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <Badge 
            variant={item.itemType === "ingredient" ? "secondary" : "outline"} 
            className="text-xs shrink-0"
          >
            {item.itemType === "ingredient" ? "식자재" : "용기"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          현재 재고: {item.current_quantity.toLocaleString()} {item.unit}
        </p>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.quantity}
            onChange={(e) =>
              onQuantityChange(item.stockItemId, parseFloat(e.target.value) || 0)
            }
            className="w-20 h-8 text-right text-sm"
          />
          <span className="text-xs text-muted-foreground min-w-[2rem]">
            {item.unit}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.stockItemId)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">제거</span>
        </Button>
      </div>
    </div>
  );
} 