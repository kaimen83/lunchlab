import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembershipInviteForm } from './CompanyMembershipInviteForm';
import { CompanyMembership } from '@/lib/types';

interface InvitePageProps {
  params: {
    id: string;
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { id: companyId } = params;
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사가 존재하는지 확인
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
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">회사 멤버 초대</h1>
        
        <CompanyMembershipInviteForm 
          companyId={companyId}
          companyName={company.name}
          currentUserMembership={membership as CompanyMembership}
        />
      </div>
    </div>
  );
} 