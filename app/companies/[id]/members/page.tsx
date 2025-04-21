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
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col h-full bg-gray-50">
      {/* 페이지 헤더 - 모바일에서 더 컴팩트하게 */}
      <header className="bg-white shadow-sm py-3 px-4 sm:py-4 sm:px-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-none">
              {company.name} 멤버
            </h1>
          </div>
          
          {isOwnerOrAdmin && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-auto rounded-full sm:rounded-md"
            >
              <a href={`/companies/${id}/invite`} aria-label="멤버 초대">
                <UserPlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">초대</span>
              </a>
            </Button>
          )}
        </div>
      </header>
      
      {/* 메인 콘텐츠 - 패딩 최적화 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue={initialTab} className="w-full">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
              {/* 탭 네비게이션 - 모바일에서 전체 너비 사용 */}
              <TabsList className="mb-4 w-full h-9">
                <TabsTrigger value="members" className="flex items-center gap-1 flex-1 h-full text-xs sm:text-sm">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>멤버</span>
                  <Badge variant="outline" className="ml-1 bg-gray-100 text-xs px-1.5 py-0 h-5">
                    {members?.length || 0}
                  </Badge>
                </TabsTrigger>
                
                {isOwnerOrAdmin && (
                  <TabsTrigger value="requests" className="flex items-center gap-1 flex-1 h-full text-xs sm:text-sm">
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>가입요청</span>
                    {requests.length > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0 h-5">
                        {requests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="members" className="mt-0">
                <CompanyMemberList 
                  companyId={id}
                  members={members || []} 
                  currentUserMembership={membership as CompanyMembership}
                  showInviteButton={false} // 멤버 초대 버튼 숨김 (페이지 헤더에 이미 있음)
                />
              </TabsContent>
              
              {isOwnerOrAdmin && (
                <TabsContent value="requests" className="mt-0">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm">현재 가입 신청이 없습니다.</p>
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
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 