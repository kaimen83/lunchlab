'use client';

import { useState, useEffect } from 'react';
import { CompanyMembership, CompanyMemberRole, UserProfile } from '@/lib/types';
import { useUser } from '@clerk/nextjs';
import { UserRoundIcon, ShieldCheck, Crown, UserPlus, X, LogOut, MoreVertical } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface CompanyMemberListProps {
  companyId: string;
  members: CompanyMembership[];
  currentUserMembership?: CompanyMembership;
  showInviteButton?: boolean;
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

export function CompanyMemberList({ 
  companyId, 
  members, 
  currentUserMembership,
  showInviteButton = true
}: CompanyMemberListProps) {
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
    <div className="bg-white shadow-sm rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 p-2 sm:p-3 md:p-4">
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-0">회사 멤버</h2>
        
        {/* 모바일용 액션 버튼 - 더 컴팩트하게 */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {currentUserMembership && currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={openLeaveConfirm}
              className="flex items-center text-red-500 border-red-200 hover:bg-red-50 text-xs py-1 h-7 sm:h-8"
            >
              <LogOut className="w-3 h-3 mr-1" />
              <span className="hidden xs:inline">회사 탈퇴</span>
              <span className="xs:hidden">탈퇴</span>
            </Button>
          )}
          {isAdmin && showInviteButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = `/companies/${companyId}/invite`}
              className="flex items-center text-xs py-1 h-7 sm:h-8"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              <span className="hidden xs:inline">멤버 초대</span>
              <span className="xs:hidden">초대</span>
            </Button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-4 sm:p-8">
          <p className="text-xs sm:text-sm text-gray-500">멤버 정보를 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="p-4 text-red-500 text-center text-xs sm:text-sm">
          {error}
        </div>
      ) : membersWithUsers.length === 0 ? (
        <div className="p-4 text-gray-500 text-center text-xs sm:text-sm">
          멤버가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  멤버
                </th>
                <th scope="col" className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  이메일
                </th>
                <th scope="col" className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                {isAdmin && (
                  <th scope="col" className="px-2 sm:px-3 md:px-6 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="sr-only">액션</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {membersWithUsers.map((member) => (
                <tr key={member.membership.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-3 md:px-6 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 relative rounded-full overflow-hidden bg-gray-100">
                        {member.imageUrl ? (
                          <Image
                            src={member.imageUrl}
                            alt={member.displayName}
                            fill
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-200">
                            <UserRoundIcon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-2 sm:ml-3 md:ml-4">
                        <div className="text-xs font-medium text-gray-900 line-clamp-1 max-w-[100px] sm:max-w-none">
                          {member.displayName}
                        </div>
                        <div className="text-[10px] text-gray-500 sm:hidden line-clamp-1 max-w-[100px]">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-3 md:px-6 py-2 whitespace-nowrap hidden sm:table-cell">
                    <div className="text-xs text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-2 sm:px-3 md:px-6 py-2 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-1">{getRoleIcon(member.membership.role)}</span>
                      <span className="text-[10px] sm:text-xs text-gray-700">
                        {getRoleName(member.membership.role)}
                      </span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-2 sm:px-3 md:px-6 py-2 whitespace-nowrap text-right text-[10px] sm:text-xs font-medium">
                      {/* 데스크톱 버전 - 삭제 버튼 표시 */}
                      <div className="hidden sm:block">
                        {(isOwner || (isAdmin && member.membership.role !== 'owner')) && 
                          member.membership.user_id !== currentUser?.id && (
                          <button
                            onClick={() => openDeleteConfirm(member)}
                            className="text-red-500 hover:text-red-700"
                            disabled={isProcessing}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      
                      {/* 모바일 버전 - 작은 버튼으로 변경 */}
                      <div className="sm:hidden">
                        {(isOwner || (isAdmin && member.membership.role !== 'owner')) && 
                          member.membership.user_id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirm(member)}
                            className="h-6 w-6 p-0 text-red-500"
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* 회원 삭제 확인 다이얼로그 - 모바일 최적화 */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90vw] rounded-lg p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base sm:text-lg">
              {isLeaving ? '회사 탈퇴 확인' : '멤버 삭제 확인'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isLeaving 
                ? '정말로 이 회사에서 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
                : `정말로 ${memberToDelete?.displayName} 멤버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-row sm:justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isProcessing}
              className="flex-1 sm:flex-none h-8 text-xs"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => isLeaving 
                ? deleteMember(currentUser!.id) 
                : deleteMember(memberToDelete!.membership.user_id)
              }
              disabled={isProcessing}
              className="flex-1 sm:flex-none h-8 text-xs"
            >
              {isProcessing ? '처리 중...' : isLeaving ? '탈퇴하기' : '삭제하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 