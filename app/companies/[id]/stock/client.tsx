"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList } from 'lucide-react';
import dynamic from 'next/dynamic';

// 클라이언트 컴포넌트 동적 임포트
const StockItemsPage = dynamic(() => import('./items/page'), { ssr: false });
const StockTransactionsPage = dynamic(() => import('./transactions/page'), { ssr: false });

interface StockClientProps {
  companyId: string;
}

export default function StockClient({ companyId }: StockClientProps) {
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
        <StockItemsPage companyId={companyId} />
      </TabsContent>
      
      <TabsContent value="transactions" className="space-y-4">
        <StockTransactionsPage companyId={companyId} />
      </TabsContent>
    </Tabs>
  );
} 