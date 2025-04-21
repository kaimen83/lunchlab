"use client"

import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import FeedbackModal from './FeedbackModal'
import { useUser } from '@clerk/nextjs'

export default function FloatingFeedbackButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasRepliedFeedback, setHasRepliedFeedback] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [repliesViewed, setRepliesViewed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useUser()

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

  // 피드백 목록을 조회하여 답변이 있는지 확인
  const checkForRepliedFeedback = async () => {
    // 이미 답변을 확인한 상태라면 체크하지 않음
    if (repliesViewed || !user) {
      return;
    }
    
    try {
      setIsLoading(true)
      const response = await fetch('/api/feedback')
      
      if (!response.ok) {
        throw new Error('피드백 데이터를 불러오는데 실패했습니다')
      }
      
      const { data } = await response.json()
      
      // 답변이 있는 피드백 수 계산 (관리자의 경우 자신의 피드백에 대한 답변만 확인)
      const repliedCount = data?.filter(
        (feedback: any) => 
          feedback.status === 'replied' && 
          (!isAdmin || (isAdmin && feedback.user_id === user.id))
      ).length || 0
      
      setHasRepliedFeedback(repliedCount)
    } catch (error) {
      console.error('피드백 알림 확인 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 컴포넌트 마운트 시 답변된 피드백 확인
  useEffect(() => {
    if (user) {
      checkForRepliedFeedback()
      
      // 30초마다 답변 확인
      const interval = setInterval(() => {
        checkForRepliedFeedback()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [repliesViewed, user, isAdmin])
  
  // 모달이 닫힐 때 호출
  const handleModalClose = () => {
    setIsModalOpen(false)
    // 이미 답변을 확인한 상태가 아닐 때만 체크
    if (!repliesViewed) {
      checkForRepliedFeedback()
    }
  }
  
  // 답변 확인 처리
  const handleRepliesViewed = () => {
    setHasRepliedFeedback(0) // 답변을 확인했으므로 알림 뱃지 제거
    setRepliesViewed(true) // 답변을 확인한 상태로 저장
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