'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRoundIcon, Calendar, Building, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 초대 상태 타입
type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'all';

// 초대 타입
interface Inviter {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface Company {
  id: string;
  name: string;
  description: string | null;
}

interface Invitation {
  id: string;
  company_id: string;
  invited_by: string;
  invited_user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  company: Company;
  inviter: Inviter;
  isExpired: boolean;
}

export function InvitationsList() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InvitationStatus>('pending');
  
  // 초대 목록 로드
  const loadInvitations = async (status: InvitationStatus = 'pending') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/user/invitations?status=${status}`);
      
      if (!response.ok) {
        throw new Error('초대 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('초대 목록 로드 중 오류:', err);
      setError('초대 목록을 불러오는데 실패했습니다.');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 초기 로드
  useEffect(() => {
    loadInvitations(activeTab);
  }, [activeTab]);
  
  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    setActiveTab(value as InvitationStatus);
  };
  
  // 초대 수락 처리
  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/companies/invitations/${invitationId}/accept`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '초대 수락에 실패했습니다.');
      }
      
      // 초대 수락 후 해당 회사 페이지로 이동
      router.push(`/companies/${data.company_id}`);
    } catch (err) {
      console.error('초대 수락 중 오류:', err);
      alert('초대 수락에 실패했습니다.');
    }
  };
  
  // 초대 거절 처리
  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/companies/invitations/${invitationId}/reject`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '초대 거절에 실패했습니다.');
      }
      
      // 초대 목록 새로고침
      loadInvitations(activeTab);
    } catch (err) {
      console.error('초대 거절 중 오류:', err);
      alert('초대 거절에 실패했습니다.');
    }
  };
  
  // 역할 표시 함수
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      case 'member':
        return '멤버';
      default:
        return role;
    }
  };
  
  // 날짜 포맷 함수
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '날짜 없음';
    return format(parseISO(dateString), 'yyyy년 MM월 dd일', { locale: ko });
  };
  
  // 초대자 이름 표시 함수
  const getInviterName = (inviter: Inviter) => {
    // 이름이 있는 경우 이름 표시
    if (inviter.firstName || inviter.lastName) {
      return `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim();
    }
    // 이름이 없고 이메일이 있는 경우 이메일 표시
    if (inviter.email) {
      return inviter.email;
    }
    // 모두 없는 경우 기본값 표시
    return '알 수 없는 사용자';
  };
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">대기 중</TabsTrigger>
          <TabsTrigger value="accepted">수락됨</TabsTrigger>
          <TabsTrigger value="rejected">거절됨</TabsTrigger>
          <TabsTrigger value="all">전체</TabsTrigger>
        </TabsList>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{invitation.company.name}</h3>
                      
                      <div className="mt-2 text-sm text-gray-500">
                        {invitation.company.description || '회사 설명 없음'}
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          <span>역할: {getRoleDisplay(invitation.role)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <UserRoundIcon className="w-4 h-4 mr-1" />
                          <span>
                            초대자: {getInviterName(invitation.inviter)}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>초대일: {formatDate(invitation.created_at)}</span>
                        </div>
                        
                        {invitation.expires_at && (
                          <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1 text-amber-500" />
                            <span>만료일: {formatDate(invitation.expires_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {invitation.status === 'pending' && !invitation.isExpired ? (
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="default"
                            size="sm"
                            className="flex items-center"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            수락
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => handleRejectInvitation(invitation.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            거절
                          </Button>
                        </div>
                      ) : invitation.status === 'accepted' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          수락됨
                        </span>
                      ) : invitation.status === 'rejected' ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center">
                          <XCircle className="w-3 h-3 mr-1" />
                          거절됨
                        </span>
                      ) : invitation.isExpired ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          만료됨
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {activeTab === 'pending'
                ? '대기 중인 초대가 없습니다.'
                : activeTab === 'accepted'
                ? '수락한 초대가 없습니다.'
                : activeTab === 'rejected'
                ? '거절한 초대가 없습니다.'
                : '초대 내역이 없습니다.'}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 