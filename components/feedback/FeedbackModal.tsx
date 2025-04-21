"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Clock, 
  Check, 
  MailQuestion
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'

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
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null)
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

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // 피드백 내용 축약 함수
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // 상태에 따른 배지 컴포넌트
  function StatusBadge({ status }: { status: string }) {
    switch(status) {
      case 'unread':
        return <Badge variant="destructive" className="ml-2">읽지 않음</Badge>
      case 'read':
        return <Badge variant="outline" className="ml-2">검토중</Badge>
      case 'replied':
        return <Badge variant="default" className="ml-2">답변완료</Badge>
      default:
        return <Badge variant="secondary" className="ml-2">{status}</Badge>
    }
  }

  // 상태에 따른 아이콘
  function StatusIcon({ status }: { status: string }) {
    switch(status) {
      case 'unread':
        return <MailQuestion className="h-4 w-4 text-destructive" />
      case 'read':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'replied':
        return <Check className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  const toggleFeedback = (id: string) => {
    if (expandedFeedback === id) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(id);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
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
          
          <TabsContent value="history" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">
                총 {userFeedbacks.length}개의 피드백
              </h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadUserFeedbacks} 
                className="flex items-center gap-1"
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>

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
              <ScrollArea className="h-[calc(70vh-12rem)] pr-4">
                <div className="space-y-2">
                  {userFeedbacks.map((feedback) => (
                    <Collapsible
                      key={feedback.id}
                      open={expandedFeedback === feedback.id}
                      onOpenChange={() => toggleFeedback(feedback.id)}
                      className="border rounded-lg overflow-hidden transition-all"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-3">
                            <StatusIcon status={feedback.status} />
                            <div>
                              <p className="text-sm font-medium flex items-center">
                                {truncateText(feedback.content, 40)}
                                <StatusBadge status={feedback.status} />
                              </p>
                              <p className="text-xs text-muted-foreground">{formatDate(feedback.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {expandedFeedback === feedback.id ? 
                              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 py-3 border-t bg-muted/30">
                          {feedback.reply ? (
                            <div>
                              <h4 className="text-xs uppercase text-muted-foreground mb-1">관리자 답변</h4>
                              <div className="bg-primary/5 p-3 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{feedback.reply}</p>
                                {feedback.replied_at && (
                                  <div className="text-xs text-muted-foreground mt-2">
                                    답변 시간: {new Date(feedback.replied_at).toLocaleString('ko-KR')}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {feedback.status === 'read' ? 
                                '관리자가 검토 중입니다.' : 
                                '아직 확인되지 않았습니다.'
                              }
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 