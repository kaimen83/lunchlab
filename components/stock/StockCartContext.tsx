import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { StockItem } from "./StockTable";
import { useToast } from "@/hooks/use-toast";

// 장바구니 항목 타입
export interface CartItem {
  stockItemId: string;
  name: string;
  current_quantity: number;
  unit: string;
  quantity: number; // 입고/출고할 수량
  itemType: "ingredient" | "container"; // 항목 유형 추가
  warehouseId?: string; // 개별 창고 ID 추가
}

// 장바구니 컨텍스트 인터페이스
interface StockCartContextType {
  items: CartItem[];
  transactionType: "in" | "out"; // 입고 또는 출고
  transactionDate: Date; // 거래 날짜
  selectedWarehouseId: string | undefined; // 기본 선택된 창고 ID
  useMultipleWarehouses: boolean; // 다중 창고 사용 여부
  addItem: (item: StockItem) => void;
  removeItem: (stockItemId: string) => void;
  updateQuantity: (stockItemId: string, quantity: number) => void;
  updateItemWarehouse: (stockItemId: string, warehouseId: string) => void; // 개별 아이템 창고 변경
  clearCart: () => void;
  setTransactionType: (type: "in" | "out") => void;
  setTransactionDate: (date: Date) => void; // 거래 날짜 설정 함수
  setSelectedWarehouseId: (warehouseId: string | undefined) => void; // 창고 설정 함수
  setUseMultipleWarehouses: (use: boolean) => void; // 다중 창고 모드 설정
  processCart: (notes: string, companyId: string) => Promise<boolean>;
}

// 기본값 생성
const StockCartContext = createContext<StockCartContextType | undefined>(undefined);

// 컨텍스트 제공자 컴포넌트
export function StockCartProvider({ 
  children, 
  initialWarehouseId 
}: { 
  children: ReactNode;
  initialWarehouseId?: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date()); // 현재 날짜로 초기화
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(initialWarehouseId); // 선택된 창고 ID
  const [useMultipleWarehouses, setUseMultipleWarehouses] = useState<boolean>(false); // 다중 창고 모드
  const { toast } = useToast();

  // 상위에서 전달받은 창고 ID가 변경되면 상태 업데이트
  useEffect(() => {
    setSelectedWarehouseId(initialWarehouseId);
  }, [initialWarehouseId]);

  // 항목 추가
  const addItem = (item: StockItem) => {
    // 이미 장바구니에 있는지 확인
    if (items.some(i => i.stockItemId === item.id)) {
      toast({
        title: "이미 추가된 항목입니다",
        description: "장바구니에 이미 추가된 항목입니다.",
        variant: "default",
      });
      return;
    }

    // 장바구니에 항목 추가
    setItems(prev => [
      ...prev,
      {
        stockItemId: item.id,
        name: item.name || item.details?.name || "알 수 없음",
        current_quantity: item.current_quantity,
        unit: item.unit,
        quantity: 1, // 기본 수량
        itemType: item.item_type, // 항목 유형 추가
        warehouseId: selectedWarehouseId, // 기본 창고로 설정
      },
    ]);

    toast({
      title: "항목이 추가되었습니다",
      description: `${item.name || item.details?.name || "알 수 없음"}이(가) 장바구니에 추가되었습니다.`,
    });
  };

  // 항목 제거
  const removeItem = (stockItemId: string) => {
    setItems(prev => prev.filter(item => item.stockItemId !== stockItemId));
  };

  // 수량 업데이트
  const updateQuantity = (stockItemId: string, quantity: number) => {
    setItems(prev =>
      prev.map(item =>
        item.stockItemId === stockItemId ? { ...item, quantity } : item
      )
    );
  };

  // 개별 아이템 창고 업데이트
  const updateItemWarehouse = (stockItemId: string, warehouseId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.stockItemId === stockItemId ? { ...item, warehouseId } : item
      )
    );
  };

  // 장바구니 비우기
  const clearCart = () => {
    setItems([]);
    setUseMultipleWarehouses(false);
  };

  // 일괄 처리
  const processCart = async (notes: string, companyId: string): Promise<boolean> => {
    if (items.length === 0) {
      toast({
        title: "장바구니가 비어있습니다",
        description: "처리할 항목이 없습니다.",
        variant: "destructive",
      });
      return false;
    }

    // 다중 창고 모드일 때 모든 아이템에 창고가 설정되어 있는지 확인
    if (useMultipleWarehouses) {
      const itemsWithoutWarehouse = items.filter(item => !item.warehouseId);
      if (itemsWithoutWarehouse.length > 0) {
        toast({
          title: "창고가 선택되지 않은 항목이 있습니다",
          description: `${itemsWithoutWarehouse.map(item => item.name).join(", ")}의 창고를 선택해주세요.`,
          variant: "destructive",
        });
        return false;
      }
    } else {
      // 일괄 창고 모드일 때 기본 창고가 선택되어 있는지 확인
      if (!selectedWarehouseId) {
        toast({
          title: "창고를 선택해주세요",
          description: "거래를 처리할 창고를 선택해주세요.",
          variant: "destructive",
        });
        return false;
      }
    }

    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stockItemIds: items.map(item => item.stockItemId),
            quantities: items.map(item => item.quantity),
            warehouseIds: useMultipleWarehouses 
              ? items.map(item => item.warehouseId)
              : items.map(() => selectedWarehouseId), // 일괄 모드일 때는 모든 아이템에 같은 창고 적용
            requestType: transactionType === "in" ? "incoming" : "outgoing",
            notes,
            directProcess: true, // 직접 처리 플래그
            transactionDate: transactionDate.toISOString(), // 거래 날짜 추가
            useMultipleWarehouses, // 다중 창고 모드 플래그
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "일괄 거래 생성에 실패했습니다");
      }

      const warehouseInfo = useMultipleWarehouses 
        ? `다중 창고 거래 (${new Set(items.map(item => item.warehouseId)).size}개 창고)`
        : `단일 창고 거래`;

      toast({
        title: "일괄 거래가 생성되었습니다",
        description: `${transactionType === "in" ? "입고" : "출고"} 거래가 성공적으로 처리되었습니다. (${warehouseInfo})`,
      });

      // 성공 후 장바구니 비우기
      clearCart();
      
      return true;
    } catch (error) {
      console.error("일괄 거래 생성 오류:", error);
      toast({
        title: "일괄 거래 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
      return false;
    }
  };

  const contextValue: StockCartContextType = {
    items,
    transactionType,
    transactionDate,
    selectedWarehouseId,
    useMultipleWarehouses,
    addItem,
    removeItem,
    updateQuantity,
    updateItemWarehouse,
    clearCart,
    setTransactionType,
    setTransactionDate,
    setSelectedWarehouseId,
    setUseMultipleWarehouses,
    processCart,
  };

  return (
    <StockCartContext.Provider value={contextValue}>
      {children}
    </StockCartContext.Provider>
  );
}

// 컨텍스트 사용을 위한 훅
export function useStockCart() {
  const context = useContext(StockCartContext);
  if (context === undefined) {
    throw new Error("useStockCart must be used within a StockCartProvider");
  }
  return context;
} 