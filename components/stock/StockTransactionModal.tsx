'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useStockCart } from "./StockCartContext";
import WarehouseSelector from "./WarehouseSelector";
import { CookingPlanImportModal } from "./CookingPlanImportModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 수량 포맷 함수
const formatQuantity = (quantity: number, unit: string) => {
  const formatted = quantity.toLocaleString('ko-KR');
  return `${formatted} ${unit}`;
};

interface StockTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onTransactionComplete?: () => void;
}

export function StockTransactionModal({ 
  open, 
  onOpenChange, 
  companyId, 
  onTransactionComplete 
}: StockTransactionModalProps) {
  const {
    items,
    transactionType,
    transactionDate,
    selectedWarehouseId,
    destinationWarehouseId,
    useMultipleWarehouses,
    removeItem,
    updateQuantity,
    updateItemWarehouse,
    setTransactionType,
    setTransactionDate,
    setSelectedWarehouseId,
    setDestinationWarehouseId,
    setUseMultipleWarehouses,
    processCart,
    clearCart,
  } = useStockCart();

  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCookingPlanModalOpen, setIsCookingPlanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");
  
  // 탭 전환 제한 알림 모달 상태
  const [isTabRestrictAlertOpen, setIsTabRestrictAlertOpen] = useState(false);
  const [tabRestrictMessage, setTabRestrictMessage] = useState({
    title: "",
    description: ""
  });

  // 모달이 열릴 때 초기 탭 설정
  useEffect(() => {
    if (open) {
      // 장바구니에 아이템이 있으면 수동설정, 없으면 빠른 설정
      const initialTab = items.length > 0 ? "manual" : "quick";
      setActiveTab(initialTab);
    }
  }, [open, items.length]);

  // 탭 전환 핸들러 (조건부 차단)
  const handleTabChange = (newTab: string) => {
    // 빠른 설정으로 전환 시도 시 장바구니 체크
    if (newTab === "quick" && items.length > 0) {
      setTabRestrictMessage({
        title: "탭 전환 불가",
        description: "장바구니에 아이템이 있어서 빠른 설정을 사용할 수 없습니다. 장바구니를 비우거나 수동 설정을 사용해주세요."
      });
      setIsTabRestrictAlertOpen(true);
      return; // 탭 전환 차단
    }
    
    // 수동 설정으로 전환 시도 시 빈 장바구니 체크
    if (newTab === "manual" && items.length === 0) {
      setTabRestrictMessage({
        title: "탭 전환 불가",
        description: "장바구니가 비어있어서 수동 설정을 사용할 수 없습니다. 먼저 재고 항목을 장바구니에 추가해주세요."
      });
      setIsTabRestrictAlertOpen(true);
      return; // 탭 전환 차단
    }

    // 조건을 만족하면 탭 전환 허용
    setActiveTab(newTab);
  };

  // 장바구니 처리 핸들러
  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const success = await processCart(notes, companyId);
      if (success) {
        if (onTransactionComplete) {
          onTransactionComplete();
        }
        // 성공 시 모달 닫기
        onOpenChange(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 조리계획서 불러오기 완료 핸들러
  const handleCookingPlanImportComplete = () => {
    if (onTransactionComplete) {
      onTransactionComplete();
    }
    // 조리계획서에서 아이템을 가져오면 수동 설정 탭으로 이동
    setActiveTab("manual");
    // 모달 닫기
    onOpenChange(false);
  };

  // 장바구니에 항목이 추가될 때 자동으로 수동 설정 탭으로 전환
  useEffect(() => {
    if (items.length > 0 && activeTab === "quick") {
      setActiveTab("manual");
    }
  }, [items.length, activeTab]);

  // 다중 창고 모드 토글 핸들러
  const handleMultipleWarehousesToggle = (checked: boolean) => {
    setUseMultipleWarehouses(checked);
    if (!checked) {
      // 단일 창고 모드로 전환 시 모든 아이템의 창고를 기본 창고로 설정
      items.forEach(item => {
        if (selectedWarehouseId) {
          updateItemWarehouse(item.stockItemId, selectedWarehouseId);
        }
      });
    }
  };

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setNotes("");
    // 초기 탭은 모달이 다시 열릴 때 장바구니 상태에 따라 설정됨
    onOpenChange(false);
  };

  // 창고간 이동 시 원본과 대상 창고가 같은지 확인
  const isSameWarehouse = transactionType === "transfer" && 
    selectedWarehouseId && 
    destinationWarehouseId && 
    selectedWarehouseId === destinationWarehouseId;

  // 처리 버튼 비활성화 조건
  const isProcessDisabled = isProcessing || isSameWarehouse;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">재고 거래 생성</DialogTitle>
            <DialogDescription>
              재고 항목을 선택하여 입고 또는 출고 거래를 생성합니다
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <Tabs className="w-full h-full flex flex-col" value={activeTab} onValueChange={handleTabChange}>
              <div className="pb-4 flex-shrink-0">
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
              <TabsContent value="quick" className="mt-4 flex-1 min-h-0">
                <div className="h-full max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">조리계획서에서 자동 불러오기</Label>
                    </div>
                    
                    <div className="grid gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCookingPlanModalOpen(true)}
                        className="w-full justify-start gap-4 h-16 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-base">조리계획서에서 불러오기</span>
                          <span className="text-sm text-muted-foreground">필요 수량이 자동으로 계산됩니다</span>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          자동
                        </Badge>
                      </Button>

                      {/* 안내 메시지 */}
                      <Card className="border-dashed">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-2">
                            <div className="text-muted-foreground text-sm">
                              조리계획서에서 필요한 식재료와 용기를 자동으로 불러와서<br />
                              빠르게 입고/출고 거래를 생성할 수 있습니다.
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 수동 설정 탭 */}
              <TabsContent value="manual" className="mt-4 flex-1 min-h-0">
                <div className="h-full max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
                  <div className="space-y-6">
                    {/* 거래 설정 섹션 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Settings className="h-4 w-4" />
                          거래 설정
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* 거래 유형 */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">거래 유형</Label>
                            <div className="grid grid-cols-3 gap-2">
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
                              <Button
                                type="button"
                                variant={transactionType === "transfer" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTransactionType("transfer")}
                                className="justify-center"
                              >
                                <Warehouse className="mr-1.5 h-3.5 w-3.5" />
                                이동
                              </Button>
                            </div>
                          </div>

                          {/* 창고 선택 - 창고간 이동이 아닌 경우 */}
                          {transactionType !== "transfer" && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">기본 창고</Label>
                              <WarehouseSelector
                                companyId={companyId}
                                selectedWarehouseId={selectedWarehouseId}
                                onWarehouseChange={(warehouseId) => setSelectedWarehouseId(warehouseId ?? null)}
                                placeholder="창고 선택"
                                className="h-9"
                                showAllOption={false}
                              />
                            </div>
                          )}

                          {/* 창고간 이동을 위한 원본/대상 창고 선택 */}
                          {transactionType === "transfer" && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">원본 창고</Label>
                                <WarehouseSelector
                                  companyId={companyId}
                                  selectedWarehouseId={selectedWarehouseId || undefined}
                                  onWarehouseChange={(warehouseId) => setSelectedWarehouseId(warehouseId ?? null)}
                                  placeholder="원본 창고 선택"
                                  className="h-9"
                                  showAllOption={false}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">대상 창고</Label>
                                <WarehouseSelector
                                  companyId={companyId}
                                  selectedWarehouseId={destinationWarehouseId || undefined}
                                  onWarehouseChange={(warehouseId) => setDestinationWarehouseId(warehouseId ?? null)}
                                  placeholder="대상 창고 선택"
                                  className="h-9"
                                  showAllOption={false}
                                />
                              </div>
                            </>
                          )}

                          {/* 거래 날짜 */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">거래 날짜</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9",
                                    !transactionDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                  {transactionDate ? (
                                    format(transactionDate, "yyyy.MM.dd", { locale: ko })
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

                        {/* 창고간 이동 시 같은 창고 선택 경고 */}
                        {isSameWarehouse && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              원본 창고와 대상 창고가 같습니다. 서로 다른 창고를 선택해주세요.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* 다중 창고 모드 토글 */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Warehouse className="h-5 w-5 text-primary" />
                            <div>
                              <Label className="text-sm font-medium">다중 창고 거래</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                각 항목별로 다른 창고를 선택할 수 있습니다
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={useMultipleWarehouses}
                            onCheckedChange={handleMultipleWarehousesToggle}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* 장바구니 섹션 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <ShoppingCart className="h-4 w-4" />
                            장바구니
                          </CardTitle>
                          {items.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearCart}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              전체 삭제
                            </Button>
                          )}
                        </div>
                        <CardDescription>
                          재고 테이블에서 항목을 추가하거나 조리계획서를 불러와 주세요
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {items.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="mb-2">
                              <Package className="h-8 w-8 mx-auto opacity-50" />
                            </div>
                            <p className="text-sm">장바구니가 비어있습니다</p>
                            <p className="text-xs mt-1">
                              재고 테이블에서 항목을 추가하거나 조리계획서를 불러와 주세요
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto">
                            <div className="space-y-2 pr-2">
                            {items.map((item, index) => (
                              <CartItemRow
                                key={item.stockItemId}
                                item={item}
                                companyId={companyId}
                                useMultipleWarehouses={useMultipleWarehouses}
                                onRemove={removeItem}
                                onQuantityChange={updateQuantity}
                                onWarehouseChange={updateItemWarehouse}
                                isLast={index === items.length - 1}
                              />
                            ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 메모 섹션 */}
                    {items.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">메모</CardTitle>
                          <CardDescription>거래에 대한 추가 정보를 입력하세요</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder="거래에 대한 추가 정보를 입력하세요"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none h-20"
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 실행 버튼 */}
          {items.length > 0 && (
            <DialogFooter className="border-t pt-4 flex-shrink-0">
              <div className="w-full">
                {/* 버튼들 */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={!!isProcessDisabled}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={!!isProcessDisabled}
                    className={cn(
                      "flex-1 font-medium relative overflow-hidden",
                      transactionType === "in" 
                        ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" 
                        : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                      "shadow-lg hover:shadow-xl transition-all duration-200"
                    )}
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
                        ) : transactionType === "out" ? (
                          <ArrowUp className="mr-2 h-4 w-4" />
                        ) : (
                          <Warehouse className="mr-2 h-4 w-4" />
                        )}
                        {transactionType === "in" ? "입고" : transactionType === "out" ? "출고" : "이동"} 처리 ({items.length}개)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 조리계획서 불러오기 모달 */}
      <CookingPlanImportModal
        open={isCookingPlanModalOpen}
        onOpenChange={setIsCookingPlanModalOpen}
        companyId={companyId}
        onImportComplete={handleCookingPlanImportComplete}
      />

      {/* 탭 전환 제한 알림 모달 */}
      <AlertDialog open={isTabRestrictAlertOpen} onOpenChange={setIsTabRestrictAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {tabRestrictMessage.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tabRestrictMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsTabRestrictAlertOpen(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// 장바구니 아이템 행 컴포넌트
interface CartItemRowProps {
  item: any;
  companyId: string;
  useMultipleWarehouses: boolean;
  onRemove: (stockItemId: string) => void;
  onQuantityChange: (stockItemId: string, quantity: number) => void;
  onWarehouseChange: (stockItemId: string, warehouseId: string) => void;
  isLast?: boolean;
}

function CartItemRow({ 
  item, 
  companyId,
  useMultipleWarehouses,
  onRemove, 
  onQuantityChange,
  onWarehouseChange,
}: CartItemRowProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    if (value >= 0) {
      onQuantityChange(item.stockItemId, value);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {item.name}
          </span>
          <Badge 
            variant="secondary" 
            className="text-xs shrink-0"
          >
            {item.itemType === "ingredient" ? "식자료" : "용기"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          현재: {formatQuantity(item.current_quantity, item.unit)}
        </div>
        
        {/* 다중 창고 모드일 때 개별 창고 선택 */}
        {useMultipleWarehouses && (
          <div className="mt-2">
            <WarehouseSelector
              companyId={companyId}
              selectedWarehouseId={item.warehouseId}
              onWarehouseChange={(warehouseId) => warehouseId && onWarehouseChange(item.stockItemId, warehouseId)}
              placeholder="창고 선택"
              className="h-7 text-xs"
              showAllOption={false}
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-20">
          <Input
            type="number"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="h-8 text-xs text-center"
            min="0"
            step="0.1"
          />
        </div>
        <span className="text-xs text-muted-foreground w-10">
          {item.unit}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.stockItemId)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
} 