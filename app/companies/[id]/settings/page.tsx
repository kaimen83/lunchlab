import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Settings, AlertTriangle, Menu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CompanySettingsForm } from './CompanySettingsForm';
import { DangerZone } from './DangerZone';

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CompanySettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanySettingsPage({ params }: CompanySettingsPageProps) {
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
  
  // 현재 사용자가 회사의 멤버인지 확인 (소유자나 관리자만 접근 가능)
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', id)
    .eq('user_id', userId)
    .single();
  
  // 멤버가 아니거나 소유자/관리자가 아닌 경우 접근 불가
  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin';
  if (membershipError || !membership || !isOwnerOrAdmin) {
    // 접근 권한이 없는 경우 회사 메인 페이지로 리다이렉트
    redirect(`/companies/${id}`);
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* 채널 헤더 */}
      <header className="border-b border-gray-200 bg-white p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-gray-500 mr-2" />
          <h1 className="text-xl font-bold">설정</h1>
        </div>
      </header>
      
      {/* 채널 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* 회사 설정 폼 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <h2 className="text-xl font-bold mb-4">회사 정보</h2>
            
            <CompanySettingsForm 
              company={company}
              isOwner={membership.role === 'owner'}
            />
          </div>
          
          {/* 메뉴 관리 링크 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <h2 className="text-xl font-bold mb-4">메뉴 관리</h2>
            <p className="text-gray-600 mb-4">
              사이드바에 표시될 메뉴 항목을 설정하고 순서를 조정할 수 있습니다.
            </p>
            <Link href={`/companies/${id}/settings/menu`}>
              <Button className="flex items-center">
                <Menu className="h-4 w-4 mr-2" />
                메뉴 설정
              </Button>
            </Link>
          </div>
          
          {/* 위험 영역 - 삭제 등 */}
          {membership.role === 'owner' && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-5">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <h2 className="text-xl font-bold text-red-500">위험 영역</h2>
              </div>
              
              <DangerZone companyId={id} companyName={company.name} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 