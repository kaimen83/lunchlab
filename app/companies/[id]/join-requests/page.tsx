import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Company, CompanyMembership } from '@/lib/types';
import { getCompanyJoinRequests } from '@/lib/supabase-queries';
import JoinRequestsList from './JoinRequestsList';

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface JoinRequestsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JoinRequestsPage({ params }: JoinRequestsPageProps) {
  // Next.js 15에서는 params가 Promise이므로 await로 처리
  const { id: companyId } = await params;
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
    .eq('id', companyId)
    .single();
  
  if (companyError || !company) {
    notFound();
  }
  
  // 현재 사용자가 회사의 멤버인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  
  // 멤버가 아니거나 owner/admin이 아닌 경우 접근 권한 없음
  if (membershipError || !membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    // 접근 권한이 없는 경우 회사 페이지로 리다이렉트
    redirect(`/companies/${companyId}`);
  }
  
  // 가입 신청 목록 조회
  const { requests, error: requestsError } = await getCompanyJoinRequests(companyId);
  
  if (requestsError) {
    console.error('가입 신청 목록 조회 오류:', requestsError);
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">가입 신청 관리</h1>
      <p className="text-gray-600 mb-6">
        <span className="font-semibold">{company.name}</span>에 대한 가입 신청 목록입니다.
      </p>
      
      <JoinRequestsList 
        companyId={companyId}
        requests={requests}
        currentUserMembership={membership as CompanyMembership}
      />
    </div>
  );
} 