import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembership } from '@/lib/types';
import { CompanyMemberList } from '../CompanyMemberList';
import { Users } from 'lucide-react';

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CompanyMembersPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyMembersPage({ params }: CompanyMembersPageProps) {
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
  
  // 회사 멤버 목록 조회
  const { data: members, error: membersError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', id);
  
  if (membersError) {
    console.error('회사 멤버 조회 오류:', membersError);
  }
  
  const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';
  
  return (
    <div className="flex flex-col h-full">
      {/* 채널 헤더 */}
      <header className="border-b border-gray-200 bg-white p-3 flex items-center">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-gray-500 mr-2" />
          <h1 className="text-xl font-bold">멤버</h1>
        </div>
      </header>
      
      {/* 채널 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{company.name} 멤버</h2>
            
            {isOwnerOrAdmin && (
              <a
                href={`/companies/${id}/invite`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
              >
                <span className="mr-1">+</span> 멤버 초대
              </a>
            )}
          </div>
          
          <CompanyMemberList 
            companyId={id}
            members={members || []} 
            currentUserMembership={membership as CompanyMembership}
          />
        </div>
      </div>
    </div>
  );
} 