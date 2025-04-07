'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Package, Settings, PlayCircle, PauseCircle, XCircle, Loader2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MarketplaceModule, ModuleSubscriptionStatus } from '@/lib/types';

interface ModuleCardProps {
  module: MarketplaceModule & { subscription_status: ModuleSubscriptionStatus };
  companyId: string;
  isAdmin: boolean;
}

export function ModuleCard({ module, companyId, isAdmin }: ModuleCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ModuleSubscriptionStatus>(module.subscription_status);
  
  // 상태에 따른 라벨과 색상
  const statusConfig = {
    active: { label: '활성', variant: 'default' as const },
    pending: { label: '승인 대기', variant: 'outline' as const },
    suspended: { label: '일시 중지됨', variant: 'secondary' as const },
    cancelled: { label: '취소됨', variant: 'destructive' as const }
  };
  
  // 상태 변경 함수
  const setModuleStatus = async (newStatus: ModuleSubscriptionStatus) => {
    if (currentStatus === newStatus) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/modules/${module.id}/set-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '상태 변경 중 오류가 발생했습니다.');
      }
      
      const { message } = await response.json();
      toast.success(message);
      setCurrentStatus(newStatus);
      router.refresh();
    } catch (error) {
      console.error('모듈 상태 변경 오류:', error);
      toast.error(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 구독 취소 함수
  const unsubscribeModule = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/modules/${module.id}/unsubscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '구독 취소 중 오류가 발생했습니다.');
      }
      
      const { message } = await response.json();
      toast.success(message);
      setCurrentStatus('cancelled');
      router.refresh();
    } catch (error) {
      console.error('모듈 구독 취소 오류:', error);
      toast.error(error instanceof Error ? error.message : '구독 취소 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <Badge
              variant={statusConfig[currentStatus].variant}
              className="mb-2"
            >
              {statusConfig[currentStatus].label}
            </Badge>
            <CardTitle className="text-lg">{module.name}</CardTitle>
            <CardDescription className="line-clamp-2 h-10">
              {module.description || '모듈 설명이 없습니다.'}
            </CardDescription>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-5 w-5" />
                  )}
                  <span className="sr-only">메뉴</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>모듈 관리</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {currentStatus === 'active' && (
                  <>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onClick={() => setModuleStatus('suspended')}
                    >
                      <PauseCircle className="h-4 w-4 mr-2" />
                      <span>일시 중지</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Settings className="h-4 w-4 mr-2" />
                      <span>설정</span>
                    </DropdownMenuItem>
                  </>
                )}
                
                {currentStatus === 'suspended' && (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => setModuleStatus('active')}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    <span>활성화</span>
                  </DropdownMenuItem>
                )}
                
                {(currentStatus === 'active' || currentStatus === 'suspended') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="cursor-pointer text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        <span>구독 취소</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>모듈 구독 취소</AlertDialogTitle>
                        <AlertDialogDescription>
                          정말로 {module.name} 모듈 구독을 취소하시겠습니까?
                          구독을 취소하면 모듈 관련 데이터에 접근할 수 없게 됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={unsubscribeModule}
                          disabled={isLoading}
                        >
                          {isLoading ? '처리 중...' : '구독 취소'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {currentStatus === 'cancelled' && (
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => setModuleStatus('active')}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    <span>다시 구독하기</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="text-sm text-muted-foreground">
          <p>버전: {module.version}</p>
          <p>카테고리: {module.category}</p>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={currentStatus !== 'active'}
        >
          <Package className="h-4 w-4 mr-2" />
          모듈 사용하기
        </Button>
      </CardFooter>
    </Card>
  );
} 