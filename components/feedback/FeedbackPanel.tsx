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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { 
  Eye, 
  MessageSquare, 
  ArrowLeft, 
  Mail,
  User,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Clock,
  Check,
  AlertCircle,
  Filter,
  Inbox,
  Search,
  RotateCcw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { clerkClient } from '@clerk/nextjs/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Feedback {
  id: string
  content: string
  user_id: string | null
  user_email: string | null
  user_name?: string | null
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
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
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
      
      // 사용자 ID가 있는 피드백들의 사용자 이름 가져오기
      const feedbacksWithUserInfo = await Promise.all(
        (data.data || []).map(async (feedback: Feedback) => {
          if (feedback.user_id) {
            try {
              // feedback.user_id로부터 사용자 정보 조회 로직
              const userInfo = await fetchUserInfo(feedback.user_id);
              return {
                ...feedback,
                user_name: userInfo?.name || feedback.user_email,
              };
            } catch (error) {
              console.error('사용자 정보 조회 오류:', error);
              return feedback;
            }
          }
          return feedback;
        })
      );
      
      setFeedbacks(feedbacksWithUserInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      console.error('피드백 로드 오류:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 사용자 정보 조회 함수
  const fetchUserInfo = async (userId: string) => {
    try {
      // userId를 사용하여 사용자 정보를 가져오는 API 호출
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('사용자 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      return null;
    }
  };

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
        const errorData = await response.json();
        console.error('상태 업데이트 응답 오류:', errorData);
        throw new Error(errorData.error || '상태 업데이트에 실패했습니다.');
      }
      
      const data = await response.json()
      
      // 목록에서 해당 피드백 업데이트
      setFeedbacks(prev => 
        prev.map(item => item.id === id ? { ...data.data, user_name: item.user_name } : item)
      )
      
      // 선택된 피드백이 있으면 그것도 업데이트
      if (selectedFeedback && selectedFeedback.id === id) {
        setSelectedFeedback({ ...data.data, user_name: selectedFeedback.user_name })
      }

      // 성공 메시지 표시
      toast({
        title: '상태가 업데이트되었습니다',
        description: `피드백 상태가 '${getStatusLabel(status)}'(으)로 변경되었습니다.`,
      })
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
      // 에러 메시지 표시
      toast({
        title: '상태 업데이트 오류',
        description: error instanceof Error ? error.message : '상태 업데이트에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 상태 라벨 변환 함수
  const getStatusLabel = (status: string): string => {
    switch(status) {
      case 'unread': return '읽지 않음';
      case 'read': return '검토중';
      case 'replied': return '답변완료';
      default: return status;
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
        prev.map(item => item.id === selectedFeedback.id ? { ...data.data, user_name: item.user_name } : item)
      )
      
      // 선택된 피드백 업데이트
      setSelectedFeedback({ ...data.data, user_name: selectedFeedback.user_name })
      
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
  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // 아코디언 토글 함수
  const toggleFeedback = (id: string) => {
    if (expandedFeedback === id) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(id);
    }
  }

  // 상태 아이콘 컴포넌트
  function StatusIcon({ status }: { status: string }) {
    switch(status) {
      case 'unread':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'read':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'replied':
        return <Check className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  // 검색 및 필터링된 피드백
  const filteredFeedbacks = feedbacks.filter(feedback => {
    // 상태 필터링
    if (statusFilter !== 'all' && feedback.status !== statusFilter) return false;
    
    // 검색어 필터링
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const contentMatch = feedback.content?.toLowerCase().includes(query);
      const nameMatch = feedback.user_name?.toLowerCase().includes(query) || feedback.user_email?.toLowerCase().includes(query);
      return contentMatch || nameMatch;
    }
    
    return true;
  });

  // 상태별 피드백 개수
  const feedbackCounts = {
    all: feedbacks.length,
    unread: feedbacks.filter(f => f.status === 'unread').length,
    read: feedbacks.filter(f => f.status === 'read').length,
    replied: feedbacks.filter(f => f.status === 'replied').length
  };

  // 피드백 메시지 컴포넌트
  const FeedbackMessage = ({ isAdmin, content, timestamp, user }: { 
    isAdmin: boolean, 
    content: string, 
    timestamp: string,
    user?: { name?: string | null, email?: string | null }
  }) => {
    return (
      <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3 gap-2 items-end`}>
        {!isAdmin && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-accent text-accent-foreground text-xs">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        <div>
          <div className={`max-w-[280px] ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg px-3 py-2`}>
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
        {isAdmin && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">관리자</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10 border rounded-lg">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium">{error}</p>
        <Button 
          onClick={loadFeedbacks} 
          className="mt-4"
          variant="outline"
        >
          <RotateCcw className="h-4 w-4 mr-2" /> 다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-card shadow-sm border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Inbox className="h-5 w-5" /> 피드백 관리
            </h2>
            <p className="text-sm text-muted-foreground">
              사용자로부터 받은 피드백을 확인하고 관리합니다.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadFeedbacks}
            className="flex items-center gap-1 self-end"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
        
        {/* 상태 요약 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div 
            className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors ${statusFilter === 'all' ? 'bg-accent' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <div>
              <div className="text-xs text-muted-foreground uppercase">전체</div>
              <div className="text-lg font-semibold">{feedbackCounts.all}</div>
            </div>
            <div className="bg-background rounded-full p-1.5">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          
          <div 
            className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors ${statusFilter === 'unread' ? 'bg-accent' : ''}`}
            onClick={() => setStatusFilter('unread')}
          >
            <div>
              <div className="text-xs text-muted-foreground uppercase">읽지 않음</div>
              <div className="text-lg font-semibold">{feedbackCounts.unread}</div>
            </div>
            <div className="bg-destructive/10 rounded-full p-1.5">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </div>
          
          <div 
            className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors ${statusFilter === 'read' ? 'bg-accent' : ''}`}
            onClick={() => setStatusFilter('read')}
          >
            <div>
              <div className="text-xs text-muted-foreground uppercase">검토중</div>
              <div className="text-lg font-semibold">{feedbackCounts.read}</div>
            </div>
            <div className="bg-background rounded-full p-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div 
            className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors ${statusFilter === 'replied' ? 'bg-accent' : ''}`}
            onClick={() => setStatusFilter('replied')}
          >
            <div>
              <div className="text-xs text-muted-foreground uppercase">답변완료</div>
              <div className="text-lg font-semibold">{feedbackCounts.replied}</div>
            </div>
            <div className="bg-primary/10 rounded-full p-1.5">
              <Check className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </div>
      
      {/* 필터 및 검색 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="검색어를 입력하세요"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="unread">읽지 않음</SelectItem>
              <SelectItem value="read">검토중</SelectItem>
              <SelectItem value="replied">답변완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 결과 통계 */}
      <div className="text-sm text-muted-foreground">
        검색 결과: 총 {filteredFeedbacks.length}개의 피드백
      </div>
      
      {/* 피드백 목록 */}
      {filteredFeedbacks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">피드백이 없습니다.</p>
          <p className="text-sm text-muted-foreground mt-1">다른 필터를 선택하거나 검색어를 변경해 보세요.</p>
        </div>
      ) : (
        <Card className="border shadow-sm">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-3 space-y-2">
              {filteredFeedbacks.map((feedback) => (
                <Collapsible
                  key={feedback.id}
                  open={expandedFeedback === feedback.id}
                  onOpenChange={() => toggleFeedback(feedback.id)}
                  className="border rounded-lg overflow-hidden"
                >
                  <CollapsibleTrigger asChild>
                    <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={feedback.status} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {feedback.user_name || feedback.user_email || '익명 사용자'}
                            </p>
                            <Badge variant={
                              feedback.status === 'unread' ? 'destructive' : 
                              feedback.status === 'read' ? 'outline' : 
                              'default'
                            } className="text-xs">
                              {getStatusLabel(feedback.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(feedback.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground max-w-[16rem] truncate hidden md:block">
                          {truncateText(feedback.content, 30)}
                        </p>
                        {expandedFeedback === feedback.id ? 
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : 
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        }
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 py-3 border-t bg-muted/10 space-y-3">
                      <div className="chat-container space-y-2">
                        {/* 사용자 피드백 메시지 */}
                        <FeedbackMessage 
                          isAdmin={false}
                          content={feedback.content}
                          timestamp={feedback.created_at}
                          user={{ name: feedback.user_name, email: feedback.user_email }}
                        />
                        
                        {/* 관리자 답변 (있는 경우) */}
                        {feedback.reply ? (
                          <FeedbackMessage 
                            isAdmin={true}
                            content={feedback.reply}
                            timestamp={feedback.replied_at || feedback.created_at}
                          />
                        ) : (
                          <div className="flex justify-end mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => openFeedbackDetail(feedback)}
                              className="flex items-center gap-1.5"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              답변하기
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* 피드백 상세 보기 대화상자 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>피드백 상세</DialogTitle>
            <DialogDescription>
              답변을 작성하면 사용자에게 알림이 전송됩니다.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="bg-muted/10 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedFeedback.user_name || selectedFeedback.user_email || '익명 사용자'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={
                    selectedFeedback.status === 'unread' ? 'destructive' : 
                    selectedFeedback.status === 'read' ? 'outline' : 
                    'default'
                  }>
                    {getStatusLabel(selectedFeedback.status)}
                  </Badge>
                </div>
                
                <div className="chat-container">
                  {/* 사용자 피드백 메시지 */}
                  <FeedbackMessage 
                    isAdmin={false}
                    content={selectedFeedback.content}
                    timestamp={selectedFeedback.created_at}
                    user={{ name: selectedFeedback.user_name, email: selectedFeedback.user_email }}
                  />
                  
                  {/* 관리자 답변 (있는 경우) */}
                  {selectedFeedback.reply && (
                    <FeedbackMessage 
                      isAdmin={true}
                      content={selectedFeedback.reply}
                      timestamp={selectedFeedback.replied_at || selectedFeedback.created_at}
                    />
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-base font-semibold mb-2">답변</h3>
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
    </div>
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