'use client';

import { useState, useEffect } from 'react';
import { CompanyMembership, CompanyMemberRole } from '@/lib/types';
import { useUser } from '@clerk/nextjs';
import { UserRoundIcon, ShieldCheck, Crown, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyMemberListProps {
  companyId: string;
  members: CompanyMembership[];
  currentUserMembership?: CompanyMembership;
}

interface MemberWithUser {
  membership: CompanyMembership;
  displayName: string;
  email: string;
  imageUrl?: string;
}

export function CompanyMemberList({ companyId, members, currentUserMembership }: CompanyMemberListProps) {
  const { user: currentUser } = useUser();
  const [membersWithUsers, setMembersWithUsers] = useState<MemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isOwner = currentUserMembership?.role === 'owner';
  const isAdmin = currentUserMembership?.role === 'admin' || isOwner;
  
  // 멤버 목록에 대한 사용자 정보 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 모든 멤버 ID 얻기
        const userIds = members.map((m) => m.user_id);
        
        if (userIds.length === 0) {
          setMembersWithUsers([]);
          setIsLoading(false);
          return;
        }
        
        // 사용자 정보 조회 API 호출
        const response = await fetch('/api/users/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds }),
        });
        
        if (!response.ok) {
          throw new Error('사용자 정보 조회에 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 멤버십과 사용자 정보 결합
        const membersWithUserInfo = members.map((membership) => {
          const userInfo = data.users.find((u: any) => u.id === membership.user_id);
          return {
            membership,
            displayName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : '알 수 없음',
            email: userInfo?.email || '',
            imageUrl: userInfo?.imageUrl,
          };
        });
        
        setMembersWithUsers(membersWithUserInfo);
      } catch (err) {
        console.error('멤버 정보 로딩 중 오류:', err);
        setError('멤버 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [members]);
  
  // 역할에 따른 아이콘 표시
  const getRoleIcon = (role: CompanyMemberRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <UserRoundIcon className="w-4 h-4 text-gray-500" />;
    }
  };
  
  // 역할 한글 표시
  const getRoleName = (role: CompanyMemberRole) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      default:
        return '멤버';
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">회사 멤버</h2>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/companies/${companyId}/invite`}
            className="flex items-center"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            멤버 초대
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">멤버 정보를 불러오는 중...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : (
        <div className="divide-y">
          {membersWithUsers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">멤버가 없습니다.</div>
          ) : (
            membersWithUsers.map((member) => (
              <div 
                key={member.membership.id} 
                className="py-4 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    {member.imageUrl ? (
                      <img 
                        src={member.imageUrl} 
                        alt={member.displayName} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <UserRoundIcon className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{member.displayName}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center mr-2">
                    {getRoleIcon(member.membership.role)}
                    <span className="ml-1 text-sm">{getRoleName(member.membership.role)}</span>
                  </div>
                  
                  {isOwner && member.membership.user_id !== currentUser?.id && (
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 