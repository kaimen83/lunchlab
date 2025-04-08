import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembership } from '@/lib/types';
import { CompanyMemberList } from '../CompanyMemberList';
import { Users, UserPlus, AlertCircle, Info } from 'lucide-react';
import { getCompanyJoinRequests } from '@/lib/supabase-queries';
import JoinRequestsList from '../join-requests/JoinRequestsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CompanyMembersPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CompanyMembersPage({ params, searchParams }: CompanyMembersPageProps) {
  // Next.js 15에서는 params와 searchParams가 Promise이므로 await로 처리
  const { id } = await params;
  const { tab } = await searchParams;
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
  
  // 관리자 또는 소유자인 경우에만 가입 신청 목록 조회
  const { requests = [], error: requestsError } = isOwnerOrAdmin
    ? await getCompanyJoinRequests(id)
    : { requests: [], error: null };
  
  if (requestsError) {
    console.error('가입 신청 목록 조회 오류:', requestsError);
  }
  
  // 초기 탭 결정 (쿼리 파라미터 또는 기본값)
  const initialTab = tab === 'requests' && isOwnerOrAdmin ? 'requests' : 'members';
  
  return (
    <div className="flex flex-col h-full">
      {/* 채널 헤더 - Slack 스타일 */}
      <header className="border-b border-gray-200 bg-white p-3 flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-gray-500 mr-2" />
          <h1 className="text-xl font-semibold">멤버</h1>
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
          <div className="bg-white rounded-lg border border-gray-200 p-5 my-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{company.name} 멤버 관리</h2>
              
              {isOwnerOrAdmin && (
                <a
                  href={`/companies/${id}/invite`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                >
                  <span className="mr-1">+</span> 멤버 초대
                </a>
              )}
            </div>
            
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="members" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  멤버
                </TabsTrigger>
                
                {isOwnerOrAdmin && (
                  <TabsTrigger value="requests" className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    가입 신청
                    {requests.length > 0 && (
                      <Badge variant="destructive" className="ml-2 bg-red-500">
                        {requests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="members">
                <CompanyMemberList 
                  companyId={id}
                  members={members || []} 
                  currentUserMembership={membership as CompanyMembership}
                />
              </TabsContent>
              
              {isOwnerOrAdmin && (
                <TabsContent value="requests">
                  {requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <AlertCircle className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                      <p>현재 가입 신청이 없습니다.</p>
                    </div>
                  ) : (
                    <JoinRequestsList 
                      companyId={id}
                      requests={requests}
                      currentUserMembership={membership as CompanyMembership}
                    />
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 