import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Company, CompanyMembership } from '@/lib/types';
import { CompanyHeader } from './CompanyHeader';
import { CompanyMemberList } from './CompanyMemberList';

// Next.js 15 타입 문제 해결을 위해 인터페이스 주석 처리
// interface CompanyPageProps {
//   params: {
//     id: string;
//   };
// }

// Next.js 15에서 타입 이슈를 해결하기 위해 임시로 any 타입 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function CompanyPage({ params }: any) {
  const { id } = params;
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
  
  // 멤버가 아니라면 접근 불가 - headAdmin 예외 제거
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
  
  return (
    <div className="container mx-auto py-8 px-4">
      <CompanyHeader 
        company={company as Company} 
        membership={membership as CompanyMembership} 
      />
      
      <div className="mt-8">
        <CompanyMemberList 
          companyId={id}
          members={members || []} 
          currentUserMembership={membership as CompanyMembership}
        />
      </div>
    </div>
  );
} 