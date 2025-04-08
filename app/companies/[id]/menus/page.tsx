import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import MenusList from './MenusList';

interface MenusPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MenusPage({ params }: MenusPageProps) {
  const { id: companyId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (companyError || !company) {
    notFound();
  }
  
  // 멤버십 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  
  if (membershipError || !membership) {
    redirect(`/companies/${companyId}`);
  }
  
  // 기능 활성화 여부 확인
  const { data: feature, error: featureError } = await supabase
    .from('company_features')
    .select('is_enabled')
    .eq('company_id', companyId)
    .eq('feature_name', 'menus')
    .maybeSingle();
  
  // 기능이 비활성화된 경우 설정 페이지로 리다이렉트
  if (!feature || !feature.is_enabled) {
    redirect(`/companies/${companyId}/settings`);
  }
  
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-gray-200 bg-white p-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">메뉴 관리</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        <MenusList companyId={companyId} userRole={membership.role} />
      </div>
    </div>
  );
} 