'use client';

import { useState, useEffect } from 'react';
import { CompanyJoinRequest, CompanyMembership } from '@/lib/types';
import { UserRoundIcon, Check, X, UserPlus } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface JoinRequestsListProps {
  companyId: string;
  requests: CompanyJoinRequest[];
  currentUserMembership?: CompanyMembership;
}

interface UserInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string | null;
}

interface JoinRequestWithUser {
  request: CompanyJoinRequest;
  displayName: string;
  email: string;
  imageUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function JoinRequestsList({ companyId: _companyId, requests, currentUserMembership }: JoinRequestsListProps) {
  const { toast } = useToast();
  const [requestsWithUsers, setRequestsWithUsers] = useState<JoinRequestWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequestWithUser | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject'>('accept');
  
  const isOwner = currentUserMembership?.role === 'owner';
  const isAdmin = currentUserMembership?.role === 'admin' || isOwner;
  
  // 가입 신청에 대한 사용자 정보 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 모든 가입 신청의 사용자 ID 얻기
        const userIds = requests.map((r) => r.user_id);
        
        if (userIds.length === 0) {
          setRequestsWithUsers([]);
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
        
        // 가입 신청과 사용자 정보 결합
        const requestsWithUserInfo = requests.map((request) => {
          const userInfo = data.users.find((u: UserInfo) => u.id === request.user_id);
          return {
            request,
            displayName: userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : '알 수 없음',
            email: userInfo?.email || '',
            imageUrl: userInfo?.imageUrl,
          };
        });
        
        setRequestsWithUsers(requestsWithUserInfo);
      } catch (err) {
        console.error('사용자 정보 로딩 중 오류:', err);
        setError('사용자 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [requests]);
  
  // 가입 신청 수락 확인 다이얼로그 열기
  const openAcceptConfirm = (request: JoinRequestWithUser) => {
    setSelectedRequest(request);
    setActionType('accept');
    setIsConfirmDialogOpen(true);
  };
  
  // 가입 신청 거절 확인 다이얼로그 열기
  const openRejectConfirm = (request: JoinRequestWithUser) => {
    setSelectedRequest(request);
    setActionType('reject');
    setIsConfirmDialogOpen(true);
  };
  
  // 가입 신청 처리 함수
  const processJoinRequest = async () => {
    if (!selectedRequest) return;
    
    try {
      setIsProcessing(true);
      
      const endpoint = actionType === 'accept' 
        ? `/api/companies/join-requests/${selectedRequest.request.id}/accept` 
        : `/api/companies/join-requests/${selectedRequest.request.id}/reject`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `가입 신청 ${actionType === 'accept' ? '수락' : '거절'}에 실패했습니다.`);
      }
      
      // 성공 메시지 표시
      toast({
        title: `가입 신청 ${actionType === 'accept' ? '수락' : '거절'} 완료`,
        description: `가입 신청이 성공적으로 ${actionType === 'accept' ? '수락' : '거절'}되었습니다.`,
        variant: 'default',
      });
      
      // UI에서 해당 가입 신청 제거
      setRequestsWithUsers((prevRequests) => 
        prevRequests.filter((r) => r.request.id !== selectedRequest.request.id)
      );
    } catch (err) {
      console.error(`가입 신청 ${actionType === 'accept' ? '수락' : '거절'} 중 오류:`, err);
      toast({
        title: `가입 신청 ${actionType === 'accept' ? '수락' : '거절'} 실패`,
        description: err instanceof Error ? err.message : `가입 신청 ${actionType === 'accept' ? '수락' : '거절'} 중 오류가 발생했습니다.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setIsConfirmDialogOpen(false);
      setSelectedRequest(null);
    }
  };
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ko });
    } catch {
      return dateString;
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">가입 신청 목록</h2>
        
        {isLoading ? (
          <div className="text-center py-6">사용자 정보를 불러오는 중...</div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">{error}</div>
        ) : (
          <div>
            {requestsWithUsers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <UserPlus className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                <p>아직 가입 신청이 없습니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {requestsWithUsers.map((req) => (
                  <li key={req.request.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-gray-100 p-2 rounded-full mr-3">
                          {req.imageUrl ? (
                            <Image 
                              src={req.imageUrl} 
                              alt={req.displayName} 
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <UserRoundIcon className="w-10 h-10 text-gray-500" />
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-medium">{req.displayName || req.email}</h3>
                          <p className="text-gray-500 text-sm">{req.email}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            신청일: {formatDate(req.request.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRejectConfirm(req)}
                              className="flex items-center text-red-500 border-red-200 hover:bg-red-50"
                            >
                              <X className="w-4 h-4 mr-1" />
                              거절
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAcceptConfirm(req)}
                              className="flex items-center text-green-500 border-green-200 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              수락
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* 메시지가 있는 경우 표시 */}
                    {req.request.message && (
                      <div className="mt-3 ml-14 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">{req.request.message}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* 확인 다이얼로그 */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              가입 신청 {actionType === 'accept' ? '수락' : '거절'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept' 
                ? '이 사용자의 회사 가입 신청을 수락하시겠습니까?' 
                : '이 사용자의 회사 가입 신청을 거절하시겠습니까?'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded-full mr-3">
                  {selectedRequest.imageUrl ? (
                    <Image 
                      src={selectedRequest.imageUrl} 
                      alt={selectedRequest.displayName} 
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <UserRoundIcon className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedRequest.displayName}</p>
                  <p className="text-gray-500 text-sm">{selectedRequest.email}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button 
              onClick={processJoinRequest}
              disabled={isProcessing}
              variant={actionType === 'accept' ? 'default' : 'destructive'}
              className="flex items-center"
            >
              {actionType === 'accept' ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <X className="w-4 h-4 mr-1" />
              )}
              {isProcessing 
                ? '처리 중...' 
                : actionType === 'accept' ? '수락하기' : '거절하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 