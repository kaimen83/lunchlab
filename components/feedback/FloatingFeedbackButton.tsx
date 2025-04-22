"use client"

import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import FeedbackModal from './FeedbackModal'
import { useUser } from '@clerk/nextjs'

// localStorage 관련 유틸리티 함수
const getLastViewedAtKey = (userId: string | undefined) => {
  return `feedback-last-viewed-at-${userId || 'guest'}`
}

// 마지막으로 피드백을 확인한 시간을 가져오는 함수
const getSavedLastViewedAt = (userId: string | undefined): number => {
  if (typeof window === 'undefined') return 0
  
  try {
    const saved = localStorage.getItem(getLastViewedAtKey(userId))
    return saved ? parseInt(saved, 10) : 0
  } catch (error) {
    console.error('localStorage 접근 오류:', error)
    return 0
  }
}

// 마지막으로 피드백을 확인한 시간을 저장하는 함수
const saveLastViewedAt = (userId: string | undefined, timestamp: number): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(getLastViewedAtKey(userId), timestamp.toString())
  } catch (error) {
    console.error('localStorage 저장 오류:', error)
  }
}

export default function FloatingFeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasRepliedFeedback, setHasRepliedFeedback] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  // 마지막으로 확인한 시간을 저장하는 상태
  const [lastViewedAt, setLastViewedAt] = useState<number>(() => 0)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useUser()
  
  // localStorage에서 lastViewedAt 상태 불러오기
  useEffect(() => {
    if (user?.id) {
      const savedTimestamp = getSavedLastViewedAt(user.id)
      setLastViewedAt(savedTimestamp)
    }
  }, [user?.id])

  // 관리자 여부 확인
  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);

  // 관리자 여부 확인
  const checkIfAdmin = async () => {
    try {
      const response = await fetch('/api/auth/check-admin');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('관리자 확인 오류:', error);
    }
  };

  // 피드백 목록을 조회하여 마지막 확인 시간 이후에 답변된 피드백이 있는지 확인
  const checkForRepliedFeedback = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/feedback')
      
      if (!response.ok) {
        throw new Error('피드백 데이터를 불러오는데 실패했습니다')
      }
      
      const { data } = await response.json()
      
      // 마지막 확인 시간 이후에 답변된 피드백 수 계산
      const repliedCount = data?.filter(
        (feedback: any) => {
          // 피드백 상태가 'replied'이고
          // 마지막 확인 시간 이후에 업데이트된 경우에만 카운트
          // 관리자의 경우 자신의 피드백에 대한 답변만 확인
          const updatedAt = new Date(feedback.updated_at).getTime();
          return feedback.status === 'replied' && 
                 updatedAt > lastViewedAt && 
                 (!isAdmin || (isAdmin && feedback.user_id === user.id));
        }
      ).length || 0
      
      setHasRepliedFeedback(repliedCount)
    } catch (error) {
      console.error('피드백 알림 확인 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 컴포넌트 마운트 시와 주기적으로 답변된 피드백 확인
  useEffect(() => {
    if (user) {
      checkForRepliedFeedback()
      
      // 30초마다 답변 확인
      const interval = setInterval(() => {
        checkForRepliedFeedback()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [lastViewedAt, user, isAdmin])
  
  // 모달이 닫힐 때 호출
  const handleModalClose = () => {
    setIsModalOpen(false)
    checkForRepliedFeedback()
  }
  
  // 답변 확인 처리 - 현재 시간을 마지막 확인 시간으로 저장
  const handleRepliesViewed = () => {
    const currentTime = Date.now()
    setHasRepliedFeedback(0) // 답변을 확인했으므로 알림 뱃지 제거
    setLastViewedAt(currentTime) // 현재 시간을 마지막 확인 시간으로 설정
    
    // localStorage에 현재 시간 저장
    if (user?.id) {
      saveLastViewedAt(user.id, currentTime)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full h-12 w-12 p-0 shadow-lg"
            size="icon"
          >
            <MessageSquarePlus className="h-6 w-6" />
          </Button>
          
          {/* 답변된 피드백이 있을 경우 뱃지 표시 */}
          {hasRepliedFeedback > 0 && (
            <Badge 
              variant="destructive"
              className="absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center"
            >
              {hasRepliedFeedback}
            </Badge>
          )}
        </div>
      </div>
      
      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        onRepliesViewed={handleRepliesViewed}
      />
    </>
  )
} 