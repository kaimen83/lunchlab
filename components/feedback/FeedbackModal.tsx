"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, AlertCircle } from 'lucide-react'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

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

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('new')
  const [userFeedbacks, setUserFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useUser()

  // 사용자의 피드백 목록 불러오기
  useEffect(() => {
    if (isOpen && user && activeTab === 'history') {
      loadUserFeedbacks()
    }
  }, [isOpen, user, activeTab])

  const loadUserFeedbacks = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/feedback')
      if (!response.ok) {
        throw new Error('피드백 내역을 불러오는데 실패했습니다')
      }
      
      const data = await response.json()
      setUserFeedbacks(data.data || [])
    } catch (err) {
      console.error('피드백 내역 로드 오류:', err)
      setError('피드백 내역을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast({
        title: '피드백 내용을 입력해주세요',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          user_id: user?.id || null,
          user_email: user?.primaryEmailAddress?.emailAddress || null,
        }),
      })
      
      if (!response.ok) {
        throw new Error('피드백 제출 중 오류가 발생했습니다')
      }
      
      toast({
        title: '피드백이 제출되었습니다',
        description: '소중한 의견 감사합니다. 빠른 시일 내에 검토하겠습니다.',
      })
      
      setContent('')
      // 성공적으로 제출 후 히스토리 탭으로 전환
      setActiveTab('history')
      loadUserFeedbacks()
    } catch (error) {
      console.error('피드백 제출 오류:', error)
      toast({
        title: '오류가 발생했습니다',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 상태에 따른 배지 컴포넌트
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>피드백</DialogTitle>
          <DialogDescription>
            서비스 개선을 위한 의견을 보내주세요
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              새 피드백
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              내 피드백 내역
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">
                  피드백 내용
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="피드백 내용을 입력해주세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              
              <DialogFooter className="sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '제출 중...' : '피드백 제출'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p>로딩 중...</p>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive py-4">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            ) : userFeedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>아직 제출한 피드백이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userFeedbacks.map((feedback) => (
                  <Card key={feedback.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleString('ko-KR')}
                        </div>
                        <StatusBadge status={feedback.status} />
                      </div>
                      
                      <div className="border-b pb-2">
                        <h4 className="font-medium mb-1">내 피드백</h4>
                        <p className="whitespace-pre-wrap text-sm">{feedback.content}</p>
                      </div>
                      
                      {feedback.reply ? (
                        <div className="pt-2">
                          <h4 className="font-medium mb-1">관리자 답변</h4>
                          <p className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-lg">{feedback.reply}</p>
                          {feedback.replied_at && (
                            <div className="text-xs text-muted-foreground mt-2">
                              답변 시간: {new Date(feedback.replied_at).toLocaleString('ko-KR')}
                            </div>
                          )}
                        </div>
                      ) : feedback.status === 'read' ? (
                        <div className="pt-2 text-sm text-muted-foreground">
                          관리자가 검토 중입니다.
                        </div>
                      ) : (
                        <div className="pt-2 text-sm text-muted-foreground">
                          아직 확인되지 않았습니다.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('new')}
              >
                새 피드백 작성
              </Button>
              <Button
                type="button"
                onClick={loadUserFeedbacks}
              >
                새로고침
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 