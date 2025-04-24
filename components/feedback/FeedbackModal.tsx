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
  MailQuestion,
  User,
  Users,
  Send
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onRepliesViewed?: () => void
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

export default function FeedbackModal({ isOpen, onClose, onRepliesViewed }: FeedbackModalProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('new')
  const [userFeedbacks, setUserFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null)
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)

  // 사용자 역할 확인
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
      
      // 관리자 여부와 상관없이 항상 자신의 피드백만 표시
      const ownFeedbacks = (data.data || []).filter(
        (feedback: Feedback) => feedback.user_id === user.id
      );
      setUserFeedbacks(ownFeedbacks);
      
      // 자신의 답변된 피드백이 있는지 확인
      const hasRepliedFeedbacks = ownFeedbacks.some(
        (feedback: Feedback) => feedback.status === 'replied'
      );
      
      if (hasRepliedFeedbacks && onRepliesViewed) {
        onRepliesViewed();
      }
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
    if (!dateString) return '';
    const date = new Date(dateString);
    // 오늘인 경우 시간만 표시
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    // 올해인 경우 월/일만 표시
    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
    // 그 외는 년/월/일 표시
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // 피드백 내용 축약 함수
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // 메시지 UI 컴포넌트
  const FeedbackMessage = ({ isUser, content, timestamp, showAvatar = true }: { 
    isUser: boolean, 
    content: string, 
    timestamp: string,
    showAvatar?: boolean
  }) => {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 gap-2 items-end`}>
        {!isUser && showAvatar && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">운영</AvatarFallback>
          </Avatar>
        )}
        <div>
          <div className={`max-w-[280px] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg px-3 py-2`}>
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {new Date(timestamp).toLocaleString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
        {isUser && showAvatar && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs">
              {user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || 'U'}
            </AvatarFallback>
            <AvatarImage src={user?.imageUrl || ''} />
          </Avatar>
        )}
      </div>
    );
  };

  // 피드백 미리보기 컴포넌트
  const FeedbackPreview = ({ feedback }: { feedback: Feedback }) => {
    const messagePreview = feedback.reply 
      ? truncateText(feedback.reply, 30)
      : feedback.status === 'read' 
        ? '관리자가 검토 중입니다' 
        : '아직 확인되지 않았습니다';

    return (
      <div className="flex items-center gap-3 w-full overflow-hidden">
        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
          feedback.status === 'replied' ? 'bg-primary' : 
          feedback.status === 'read' ? 'bg-amber-500' : 'bg-destructive'
        }`} />
        <div className="overflow-hidden flex-grow">
          <p className="text-sm font-medium truncate">{truncateText(feedback.content, 40)}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate flex-grow">
              {feedback.status === 'replied' ? '답변: ' : ''}{messagePreview}
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(feedback.reply ? feedback.replied_at || feedback.created_at : feedback.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  };

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

  // 탭 변경 처리
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    
    // 히스토리 탭으로 이동하면 답변 확인 처리
    if (value === 'history') {
      loadUserFeedbacks(); // 탭 변경 시 데이터 다시 로드
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
        
        <Tabs defaultValue="new" value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                      className="border rounded-lg overflow-hidden transition-all hover:bg-accent/20"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="px-4 py-3 flex items-center justify-between cursor-pointer w-full">
                          <FeedbackPreview feedback={feedback} />
                          <div className="flex-shrink-0 ml-2">
                            {expandedFeedback === feedback.id ? 
                              <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 py-3 border-t bg-card">
                          <div className="chat-container space-y-2">
                            {/* 사용자 피드백 메시지 */}
                            <FeedbackMessage 
                              isUser={true}
                              content={feedback.content}
                              timestamp={feedback.created_at}
                            />
                            
                            {/* 관리자 답변 (있는 경우) */}
                            {feedback.reply ? (
                              <FeedbackMessage 
                                isUser={false}
                                content={feedback.reply}
                                timestamp={feedback.replied_at || feedback.created_at}
                              />
                            ) : (
                              <div className="text-center text-xs text-muted-foreground py-2 italic">
                                {feedback.status === 'read' ? 
                                  '관리자가 검토 중입니다.' : 
                                  '아직 확인되지 않았습니다.'
                                }
                              </div>
                            )}
                          </div>
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