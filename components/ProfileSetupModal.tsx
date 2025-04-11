'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { UserProfile } from '@/lib/types';

interface ProfileSetupModalProps {
  onClose?: () => void;
  initialOpen?: boolean;
}

export function ProfileSetupModal({ onClose, initialOpen = true }: ProfileSetupModalProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    affiliation: ''
  });

  // 사용자 프로필 정보 불러오기
  useEffect(() => {
    if (user) {
      // 기존 사용자 프로필 정보가 있으면 사용
      const userProfile = user.publicMetadata.profile as UserProfile | undefined;
      if (userProfile?.name) {
        setFormData(prev => ({
          ...prev,
          name: userProfile.name,
          phoneNumber: userProfile.phoneNumber || prev.phoneNumber,
          affiliation: userProfile.affiliation || prev.affiliation
        }));
      } else {
        // 프로필 정보가 없으면 Clerk 이름으로 초기화
        setFormData(prev => ({
          ...prev,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
        }));
      }
    }
  }, [user]);

  // 모달 닫기 시 DOM 이벤트 정리 함수
  const cleanupDOMAfterClose = () => {
    // 터치 및 포인터 이벤트 관련 스타일 정리
    document.body.style.pointerEvents = '';
    document.body.style.touchAction = '';
    document.documentElement.style.touchAction = '';
    
    // 안전하게 DOM 속성 제거
    try {
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        try {
          if (el instanceof HTMLElement && !el.dataset.permanent && document.body.contains(el)) {
            el.removeAttribute('aria-hidden');
          }
        } catch (e) {
          // 오류 시 무시
        }
      });
      
      // 포커스 해제
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch (e) {
      console.warn("모달 닫기 정리 중 오류:", e);
    }
  };

  // 모달이 닫힐 때 처리
  const handleOpenChange = (open: boolean) => {
    if (isOpen && !open) {
      // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
      setTimeout(() => {
        setIsOpen(false);
        cleanupDOMAfterClose();
        
        if (onClose) {
          onClose();
        }
      }, 100);
    } else {
      setIsOpen(open);
    }
  };

  // 입력 값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // 필수 필드 검증
    if (!formData.name || !formData.phoneNumber || !formData.affiliation) {
      setError('이름, 전화번호, 소속은 필수 입력항목입니다.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '프로필 설정에 실패했습니다.');
      }

      // 성공적으로 저장되면 모달 닫고 페이지 새로고침
      setTimeout(() => {
        setIsOpen(false);
        cleanupDOMAfterClose();
        
        if (onClose) {
          onClose();
        }
        router.refresh();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        onPointerDownOutside={(e) => {
          // 모달 외부 클릭 시 포인터 이벤트 정상화
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.body.focus();
          
          // 터치 이벤트 차단 문제 해결
          document.body.style.pointerEvents = '';
          document.body.style.touchAction = '';
          document.documentElement.style.touchAction = '';
          
          // 모든 포커스 제거
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }}
        aria-describedby="profile-setup-description"
      >
        <DialogHeader>
          <DialogTitle>프로필 설정</DialogTitle>
          <DialogDescription id="profile-setup-description">
            서비스 이용을 위해 추가 정보를 입력해주세요. 이 정보는 서비스 이용에 필요합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="홍길동"
              className="col-span-3 p-2 border rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="phoneNumber" className="text-right text-sm font-medium">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="010-0000-0000"
              className="col-span-3 p-2 border rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="affiliation" className="text-right text-sm font-medium">
              소속 <span className="text-red-500">*</span>
            </label>
            <input
              id="affiliation"
              name="affiliation"
              type="text"
              value={formData.affiliation}
              onChange={handleChange}
              placeholder="회사/학교/단체명"
              className="col-span-3 p-2 border rounded-md"
              required
            />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장하고 시작하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 