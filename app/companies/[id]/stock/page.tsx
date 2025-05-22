import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ClipboardList } from 'lucide-react';
import dynamic from 'next/dynamic';

// 클라이언트 컴포넌트 동적 임포트
const StockItemsPage = dynamic(() => import('./items/page'), { ssr: false });
const StockTransactionsPage = dynamic(() => import('./transactions/page'), { ssr: false });

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface StockPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StockPage({ params }: StockPageProps) {
  // Next.js 15에서는 params가 Promise이므로 await로 처리
  const { id } = await params;
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사 정보 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  
  if (companyError || !company) {
    return notFound();
  }
  
  // 현재 사용자가 회사의 멤버인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', id)
    .eq('user_id', userId)
    .single();
  
  // 멤버가 아니라면 접근 불가
  if (membershipError || !membership) {
    // 접근 권한이 없는 경우 홈으로 리다이렉트
    redirect('/');
  }
  
  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* 페이지 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-50">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">재고관리</h1>
            </div>
          </div>
        </div>
      </header>
      
      {/* 페이지 콘텐츠 */}
      <main className="flex-1 overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <StockItemsPage companyId={id} />
            </TabsContent>
            
            <TabsContent value="transactions" className="space-y-4">
              <StockTransactionsPage companyId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 