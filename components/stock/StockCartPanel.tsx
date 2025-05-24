'use client';

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  ShoppingCart,
  Trash2,
  X,
  CalendarIcon,
  FileText,
  Zap,
  Settings,
  Package,
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
  const [activeTab, setActiveTab] = useState("quick"); // 현재 활성 탭 관리

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

  // 장바구니에 항목이 추가될 때 자동으로 수동 설정 탭으로 전환
  useEffect(() => {
    if (items.length > 0 && activeTab === "quick") {
      setActiveTab("manual");
    }
  }, [items.length, activeTab]);

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

        <CardContent className="p-0">
          <Tabs defaultValue="quick" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-4 pb-2">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="quick" className="gap-2">
                  <Zap className="h-4 w-4" />
                  빠른 설정
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <Settings className="h-4 w-4" />
                  수동 설정
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 빠른 설정 탭 */}
            <TabsContent value="quick" className="px-6 pb-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">조리계획서에서 자동 불러오기</Label>
                </div>
                
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsCookingPlanModalOpen(true)}
                    className="w-full justify-start gap-3 h-12 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">조리계획서에서 불러오기</span>
                      <span className="text-xs text-muted-foreground">필요 수량이 자동으로 계산됩니다</span>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      자동
                    </Badge>
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* 수동 설정 탭 */}
            <TabsContent value="manual" className="px-6 pb-4 mt-4">
              <div className="space-y-4">
                {/* 거래 설정 섹션 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
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
              </div>
            </TabsContent>
          </Tabs>

          {/* 선택된 항목 섹션 - 모든 탭에서 공통으로 표시 */}
          <div className="px-6 pb-4">
            <Separator className="mb-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
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
                <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
                  <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground font-medium">
                    선택된 항목이 없습니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    재고 테이블에서 항목을 추가하거나 조리계획서를 불러와 주세요
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg bg-card">
                  <ScrollArea className="max-h-[480px]">
                    <div className="p-2 space-y-1">
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
              <div className="space-y-3 mt-4">
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">메모 (선택사항)</Label>
                  <Textarea
                    placeholder="거래에 대한 추가 정보를 입력하세요"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none h-16 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* 실행 버튼 */}
        {items.length > 0 && (
          <CardFooter className="px-6 pt-4 pb-6">
            <div className="w-full space-y-3">
              {/* 요약 정보 */}
              <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    transactionType === "in" ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="font-medium">
                    {transactionType === "in" ? "입고" : "출고"} 거래
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{items.length}개 항목</span>
                </div>
              </div>
              
              {/* 실행 버튼 */}
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className={cn(
                  "w-full h-12 font-medium text-base relative overflow-hidden",
                  transactionType === "in" 
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" 
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                  "shadow-lg hover:shadow-xl transition-all duration-200"
                )}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {transactionType === "in" ? (
                        <ArrowDown className="h-5 w-5" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                      <span>
                        {items.length}개 항목 {transactionType === "in" ? "입고" : "출고"} 처리
                      </span>
                    </div>
                  </>
                )}
              </Button>
            </div>
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

function CartItemRow({ item, onRemove, onQuantityChange }: CartItemRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50">
      {/* 아이템 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              item.itemType === "ingredient" ? "bg-blue-500" : "bg-green-500"
            )} />
            <span className="font-medium text-sm truncate max-w-[120px]">{item.name}</span>
          </div>
          <Badge 
            variant={item.itemType === "ingredient" ? "secondary" : "outline"} 
            className="text-xs px-1.5 py-0 h-5 shrink-0"
          >
            {item.itemType === "ingredient" ? "식자재" : "용기"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          현재: {item.current_quantity.toLocaleString()} {item.unit}
        </div>
      </div>
      
      {/* 수량 입력 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.quantity}
          onChange={(e) =>
            onQuantityChange(item.stockItemId, parseFloat(e.target.value) || 0)
          }
          className="w-16 h-7 text-right text-xs px-2 border-muted-foreground/20"
        />
        <span className="text-xs text-muted-foreground min-w-[1.5rem] text-left">
          {item.unit}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.stockItemId)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">제거</span>
        </Button>
      </div>
    </div>
  );
} 