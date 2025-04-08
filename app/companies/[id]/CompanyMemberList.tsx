'use client';

import { useState, useEffect } from 'react';
import { CompanyMembership, CompanyMemberRole, UserProfile } from '@/lib/types';
import { useUser } from '@clerk/nextjs';
import { UserRoundIcon, ShieldCheck, Crown, UserPlus, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import Image from 'next/image';

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

// 사용자 정보에 대한 인터페이스 정의
interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
  profileCompleted?: boolean;
  profile?: UserProfile;
}

export function CompanyMemberList({ companyId, members, currentUserMembership }: CompanyMemberListProps) {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [membersWithUsers, setMembersWithUsers] = useState<MemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<MemberWithUser | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isOwner = currentUserMembership?.role === 'owner';
  const isAdmin = currentUserMembership?.role === 'admin' || isOwner;
  
  // 사용자 표시 이름을 가져오는 함수
  const getUserDisplayName = (userInfo: UserInfo): string => {
    // 프로젝트 사용자 프로필이 있는 경우 우선 사용
    if (userInfo.profileCompleted && userInfo.profile?.name) {
      return userInfo.profile.name;
    }
    
    // 없으면 Clerk 이름 사용
    if (userInfo.firstName || userInfo.lastName) {
      return `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim();
    }
    
    // 이름이 없으면 이메일 또는 사용자명
    if (userInfo.email) {
      return userInfo.email.split('@')[0];
    }
    
    // 아무것도 없는 경우
    return '이름 없음';
  };
  
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
          const userInfo = data.users.find((u: UserInfo) => u.id === membership.user_id);
          
          if (!userInfo) {
            return {
              membership,
              displayName: '알 수 없음',
              email: '',
              imageUrl: undefined,
            };
          }
          
          return {
            membership,
            displayName: getUserDisplayName(userInfo),
            email: userInfo.email || '',
            imageUrl: userInfo.imageUrl,
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
  
  // 멤버 삭제 함수
  const deleteMember = async (userId: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/companies/${companyId}/members/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '멤버 삭제에 실패했습니다.');
      }
      
      const result = await response.json();
      
      // 삭제 성공 시 UI 업데이트
      setMembersWithUsers((prevMembers) => 
        prevMembers.filter((m) => m.membership.user_id !== userId)
      );
      
      toast({
        title: '멤버 삭제 완료',
        description: '멤버가 성공적으로 삭제되었습니다.',
        variant: 'default',
      });
      
      // 내가 탈퇴한 경우 메인 페이지로 리다이렉트
      if (userId === currentUser?.id) {
        // API 응답에 리다이렉트 경로가 있으면 그 경로로, 없으면 메인 페이지('/')로 이동
        window.location.href = result.redirect || '/';
      }
    } catch (err) {
      console.error('멤버 삭제 중 오류:', err);
      toast({
        title: '멤버 삭제 실패',
        description: err instanceof Error ? err.message : '멤버 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsConfirmDialogOpen(false);
      setMemberToDelete(null);
      setIsLeaving(false);
    }
  };
  
  // 멤버 삭제 확인 다이얼로그 열기
  const openDeleteConfirm = (member: MemberWithUser) => {
    setMemberToDelete(member);
    setIsLeaving(false);
    setIsConfirmDialogOpen(true);
  };
  
  // 탈퇴 확인 다이얼로그 열기
  const openLeaveConfirm = () => {
    setIsLeaving(true);
    setIsConfirmDialogOpen(true);
  };
  
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
        <div className="flex gap-2">
          {currentUserMembership && currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={openLeaveConfirm}
              className="flex items-center text-red-500 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              회사 탈퇴
            </Button>
          )}
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
                      <Image 
                        src={member.imageUrl} 
                        alt={member.displayName} 
                        width={32}
                        height={32}
                        className="rounded-full"
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500"
                      onClick={() => openDeleteConfirm(member)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* 확인 다이얼로그 */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isLeaving ? '회사 탈퇴' : '멤버 삭제'}
            </DialogTitle>
            <DialogDescription>
              {isLeaving ? 
                '정말 이 회사에서 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : 
                `정말 ${memberToDelete?.displayName} 멤버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button 
              variant="destructive"
              onClick={() => 
                isLeaving ? 
                  deleteMember(currentUser?.id || '') : 
                  memberToDelete ? deleteMember(memberToDelete.membership.user_id) : null
              }
              disabled={isProcessing}
            >
              {isProcessing ? '처리 중...' : isLeaving ? '탈퇴하기' : '삭제하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 