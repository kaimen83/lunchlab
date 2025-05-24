"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList, Utensils, Coffee } from "lucide-react";
import StockItemsPage from "./items/page";
import StockTransactionsPage from "./transactions/page";
import { StockCartProvider } from "@/components/stock/StockCartContext";

interface StockClientProps {
  companyId: string;
}

export default function StockClient({ companyId }: StockClientProps) {
  return (
    <StockCartProvider>
      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            <span>식자재 재고</span>
          </TabsTrigger>
          <TabsTrigger value="containers" className="flex items-center gap-2">
            <Coffee className="h-4 w-4" />
            <span>용기 재고</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>거래 내역</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ingredients" className="space-y-4">
          <StockItemsPage companyId={companyId} selectedItemType="ingredient" />
        </TabsContent>
        
        <TabsContent value="containers" className="space-y-4">
          <StockItemsPage companyId={companyId} selectedItemType="container" />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <StockTransactionsPage companyId={companyId} />
        </TabsContent>
      </Tabs>
    </StockCartProvider>
  );
} 