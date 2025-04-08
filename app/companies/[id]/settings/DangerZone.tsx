'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

// 회사 변경 이벤트를 발생시키는 함수
const dispatchCompanyChangeEvent = (type: 'add' | 'delete', companyId: string) => {
  // 로컬 스토리지 이벤트
  localStorage.setItem('company-change', JSON.stringify({
    type,
    companyId,
    timestamp: new Date().toISOString()
  }));
  
  // 커스텀 이벤트
  const event = new CustomEvent('company-change', { 
    detail: { type, companyId }
  });
  window.dispatchEvent(event);
};

interface DangerZoneProps {
  companyId: string;
  companyName: string;
}

export function DangerZone({ companyId, companyName }: DangerZoneProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 회사 삭제 처리
  const handleDeleteCompany = async () => {
    if (confirmText !== companyName) {
      setError('회사 이름이 일치하지 않습니다.');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회사 삭제에 실패했습니다.');
      }
      
      // 회사 삭제 이벤트 발생
      dispatchCompanyChangeEvent('delete', companyId);
      
      // 삭제 성공 시 홈으로 이동 (강제 리다이렉트)
      window.location.href = '/';
    } catch (err) {
      console.error('회사 삭제 중 오류:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        회사를 삭제하면 모든 회사 데이터와 멤버십이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      
      <Button 
        variant="destructive" 
        className="w-full"
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        회사 삭제
      </Button>
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
      
      {/* 회사 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">
              회사 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                정말로 회사 <span className="font-bold">{companyName}</span>을(를) 삭제하시겠습니까?
              </p>
              <p className="text-red-500 font-medium mb-4">
                이 작업은 되돌릴 수 없으며, 모든 회사 데이터와 멤버십이 영구적으로 삭제됩니다.
              </p>
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700">
                  확인을 위해 회사 이름 입력: <span className="font-semibold">{companyName}</span>
                </label>
                <Input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1"
                  placeholder={companyName}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting || confirmText !== companyName}
            >
              {isDeleting ? '삭제 중...' : '영구 삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 