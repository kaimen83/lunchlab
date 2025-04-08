import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembership } from '@/lib/types';
import { CompanyMemberList } from './CompanyMemberList';
import { Building, Info, Users } from 'lucide-react';

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CompanyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
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
    <div className="flex flex-col h-full">
      {/* 채널 헤더 - Slack 스타일 */}
      <header className="border-b border-gray-200 bg-white p-3 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-gray-500 font-semibold text-xl mr-2">#</span>
          <h1 className="text-xl font-semibold">일반</h1>
        </div>
        
        <div className="flex items-center">
          <button className="text-gray-500 hover:text-gray-800 p-1.5 rounded-sm hover:bg-gray-100 transition-colors duration-150 flex items-center mr-2">
            <Users className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">{members?.length || 0}</span>
          </button>
          
          <button className="text-gray-500 hover:text-gray-800 p-1.5 rounded-sm hover:bg-gray-100 transition-colors duration-150">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>
      
      {/* 채널 콘텐츠 - Slack 스타일 */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto p-4">
          {/* Slack 스타일 타임라인 메시지 */}
          <div className="border-l-2 border-gray-200 pl-4 py-3 relative mt-6">
            <div className="absolute left-[-15px] top-0 w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="h-4 w-4 text-blue-600" />
            </div>
            
            <div className="mb-2">
              <span className="font-bold">{company.name}</span>
              <span className="text-xs text-gray-500 ml-2">회사 정보</span>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-md mr-4 flex-shrink-0">
                  <Building className="h-8 w-8 text-blue-700" />
                </div>
                
                <div>
                  <h2 className="text-xl font-bold">{company.name}</h2>
                  <p className="text-gray-600 mt-1">
                    {company.description || '회사 설명이 없습니다.'}
                  </p>
                  
                  {/* 회사 역할 배지 */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      membership.role === 'owner' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : membership.role === 'admin' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {membership.role === 'owner' && '소유자'}
                      {membership.role === 'admin' && '관리자'}
                      {membership.role === 'member' && '멤버'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 멤버 목록 타임라인 메시지 */}
          <div className="border-l-2 border-gray-200 pl-4 py-3 relative mt-6">
            <div className="absolute left-[-15px] top-0 w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            
            <div className="mb-2">
              <span className="font-bold">회사 멤버</span>
              <span className="text-xs text-gray-500 ml-2">멤버 정보</span>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <CompanyMemberList 
                companyId={id}
                members={members || []} 
                currentUserMembership={membership as CompanyMembership}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 