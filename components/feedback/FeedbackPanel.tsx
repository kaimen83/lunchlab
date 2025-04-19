'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Eye, 
  MessageSquare, 
  ArrowLeft, 
  Mail 
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Feedback {
  id: string
  content: string
  user_id: string | null
  user_email: string | null
  created_at: string
  status: string
  reply: string | null
  replied_at: string | null
  replied_by: string | null
}

export default function FeedbackPanel() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // 피드백 목록 로드
  useEffect(() => {
    loadFeedbacks()
  }, [])

  const loadFeedbacks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/feedback')
      if (!response.ok) {
        throw new Error('피드백 목록을 불러오는데 실패했습니다.')
      }
      
      const data = await response.json()
      setFeedbacks(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      console.error('피드백 로드 오류:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 피드백 상세 보기
  const openFeedbackDetail = async (feedback: Feedback) => {
    try {
      const response = await fetch(`/api/feedback/${feedback.id}`)
      if (!response.ok) {
        throw new Error('피드백을 불러올 수 없습니다.')
      }
      
      const data = await response.json()
      setSelectedFeedback(data.data)
      
      // 이미 답변이 있는 경우, 답변 내용을 표시
      if (data.data.reply) {
        setReply(data.data.reply)
      } else {
        setReply('')
      }
      
      // 읽지 않은 피드백인 경우, 상태를 '읽음'으로 변경
      if (data.data.status === 'unread') {
        updateFeedbackStatus(data.data.id, 'read')
      }
      
      setDialogOpen(true)
    } catch (error) {
      console.error('피드백 조회 오류:', error)
      toast({
        title: '오류가 발생했습니다',
        description: '피드백을 불러올 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  // 피드백 상태 업데이트
  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      
      if (!response.ok) {
        throw new Error('상태 업데이트에 실패했습니다.')
      }
      
      const data = await response.json()
      
      // 목록에서 해당 피드백 업데이트
      setFeedbacks(prev => 
        prev.map(item => item.id === id ? data.data : item)
      )
      
      // 선택된 피드백이 있으면 그것도 업데이트
      if (selectedFeedback && selectedFeedback.id === id) {
        setSelectedFeedback(data.data)
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
    }
  }

  // 답변 제출
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFeedback) return
    
    if (!reply.trim()) {
      toast({
        title: '답변 내용을 입력해주세요',
        variant: 'destructive',
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/feedback/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reply }),
      })
      
      if (!response.ok) {
        throw new Error('답변 저장에 실패했습니다.')
      }
      
      const data = await response.json()
      
      // 목록에서 해당 피드백 업데이트
      setFeedbacks(prev => 
        prev.map(item => item.id === selectedFeedback.id ? data.data : item)
      )
      
      // 선택된 피드백 업데이트
      setSelectedFeedback(data.data)
      
      toast({
        title: '답변이 저장되었습니다',
      })
    } catch (error) {
      console.error('답변 저장 오류:', error)
      toast({
        title: '오류가 발생했습니다',
        description: '답변 저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 대화상자 닫기
  const closeDialog = () => {
    setDialogOpen(false)
    setSelectedFeedback(null)
    setReply('')
  }

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadFeedbacks} className="mt-4">다시 시도</Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">피드백 관리</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadFeedbacks}
        >
          새로고침
        </Button>
      </div>
      
      {feedbacks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">아직 접수된 피드백이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {feedback.user_email || '익명 사용자'}
                  </CardTitle>
                  <StatusBadge status={feedback.status} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(feedback.created_at).toLocaleString('ko-KR')}
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 whitespace-pre-wrap">{truncateText(feedback.content, 200)}</p>
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={() => openFeedbackDetail(feedback)}
                  >
                    <Eye className="h-4 w-4" />
                    <span>상세보기</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 피드백 상세 보기 대화상자 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>피드백 상세</DialogTitle>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <CardTitle className="text-lg flex items-center">
                    {selectedFeedback.user_email ? (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedFeedback.user_email}
                      </>
                    ) : (
                      '익명 사용자'
                    )}
                  </CardTitle>
                </div>
                <StatusBadge status={selectedFeedback.status} />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {new Date(selectedFeedback.created_at).toLocaleString('ko-KR')}
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap">{selectedFeedback.content}</p>
                </CardContent>
              </Card>
              
              <div className="pt-4">
                <h3 className="text-lg font-semibold mb-2">답변</h3>
                <form onSubmit={handleSubmitReply}>
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="답변을 입력하세요..."
                    className="min-h-[120px]"
                  />
                  
                  <div className="flex justify-end mt-4 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialog}
                      disabled={isSubmitting}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '저장 중...' : (selectedFeedback.reply ? '답변 수정' : '답변 저장')}
                    </Button>
                  </div>
                </form>
              </div>
              
              {/* 이미 답변한 피드백인 경우 답변 정보 표시 */}
              {selectedFeedback.replied_at && (
                <div className="text-sm text-muted-foreground pt-2">
                  마지막 답변: {new Date(selectedFeedback.replied_at).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'unread':
      return <Badge variant="destructive">읽지 않음</Badge>
    case 'read':
      return <Badge variant="outline">검토중</Badge>
    case 'replied':
      return <Badge variant="default">답변완료</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
} 