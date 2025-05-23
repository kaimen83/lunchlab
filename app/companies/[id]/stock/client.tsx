"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, Utensils, Coffee } from 'lucide-react';
import dynamic from 'next/dynamic';

// 클라이언트 컴포넌트 동적 임포트
const StockItemsPage = dynamic(() => import('./items/page'), { ssr: false });
const StockTransactionsPage = dynamic(() => import('./transactions/page'), { ssr: false });

interface StockClientProps {
  companyId: string;
}

export default function StockClient({ companyId }: StockClientProps) {
  // 현재 선택된 항목 유형 상태 (식자재/용기)
  const [itemType, setItemType] = useState<"ingredient" | "container">("ingredient");

  return (
    <Tabs defaultValue="items" className="space-y-4">
      <TabsList className="grid w-full md:w-[400px] grid-cols-2">
        <TabsTrigger value="items" className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span>재고 항목</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <span>거래 내역</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="items" className="space-y-4">
        {/* 식자재/용기 선택 탭 */}
        <Tabs 
          value={itemType} 
          onValueChange={(value) => setItemType(value as "ingredient" | "container")}
          className="w-full"
        >
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="ingredient" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span>식자재</span>
            </TabsTrigger>
            <TabsTrigger value="container" className="flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              <span>용기</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <StockItemsPage companyId={companyId} selectedItemType={itemType} />
      </TabsContent>
      
      <TabsContent value="transactions" className="space-y-4">
        <StockTransactionsPage companyId={companyId} />
      </TabsContent>
    </Tabs>
  );
} 