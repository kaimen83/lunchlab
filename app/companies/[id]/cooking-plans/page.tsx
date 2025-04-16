import { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { FileText, Plus, Search } from 'lucide-react';
import CookingPlanList from './components/CookingPlanList';

export const metadata: Metadata = {
  title: '조리계획서 - LunchLab',
  description: '회사 조리계획서 관리 페이지'
};

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CookingPlanPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CookingPlanPage({ params }: CookingPlanPageProps) {
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
    notFound();
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
  
  // 조리계획서 기능이 활성화되어 있는지 확인
  const { data: features, error: featuresError } = await supabase
    .from('company_features')
    .select('*')
    .eq('company_id', id)
    .eq('feature_name', 'cookingPlan')
    .single();
  
  // 기능이 비활성화되어 있으면 회사 메인 페이지로 리다이렉트
  if (featuresError || !features || !features.is_enabled) {
    redirect(`/companies/${id}`);
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      {/* 페이지 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">조리계획서</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* 추가적인 액션 버튼이 필요하면 이곳에 배치 */}
            </div>
          </div>
        </div>
      </header>
      
      {/* 페이지 콘텐츠 */}
      <main className="flex-1 overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow">
            <CookingPlanList companyId={id} />
          </div>
        </div>
      </main>
    </div>
  );
} 