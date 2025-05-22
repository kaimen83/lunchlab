import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembership } from '@/lib/types';
import { Package } from 'lucide-react';

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
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium mb-4">재고관리 시스템</h2>
            <p className="text-gray-500 mb-6">
              이 페이지는 현재 개발 중입니다. 곧 다양한 재고관리 기능이 추가될 예정입니다.
            </p>
            
            <div className="p-8 border border-dashed border-gray-300 rounded-md bg-gray-50 flex flex-col items-center justify-center">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                이 공간에 재고 목록과 관리 기능이 표시될 예정입니다.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 