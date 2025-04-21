"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  Eye, 
  MailCheck,
  UserRound,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Head from 'next/head'

interface PageProps {
  params: {
    id: string
  }
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

export default function FeedbackDetailPage({ params }: PageProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [reply, setReply] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useClerk()

  // 피드백 데이터 로드
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/feedback/${params.id}`)
        if (!response.ok) {
          throw new Error('피드백을 불러올 수 없습니다.')
        }
        
        const data = await response.json()
        setFeedback(data.data)
        
        // 이미 답변이 있는 경우, 답변 내용을 표시
        if (data.data.reply) {
          setReply(data.data.reply)
        }
        
        // 읽지 않은 피드백인 경우, 상태를 '읽음'으로 변경
        if (data.data.status === 'unread') {
          updateFeedbackStatus('read')
        }
      } catch (error) {
        console.error('피드백 조회 오류:', error)
        setError('피드백을 불러올 수 없습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFeedback()
  }, [params.id])
  
  // 피드백 상태 업데이트
  const updateFeedbackStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/feedback/${params.id}`, {
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
      setFeedback(data.data)
      
      toast({
        title: '상태가 업데이트되었습니다',
        description: `피드백 상태가 '${getStatusText(status)}'(으)로 변경되었습니다.`,
      })
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
      toast({
        title: '상태 업데이트 오류',
        description: '피드백 상태 변경에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }
  
  // 답변 제출
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reply.trim()) {
      toast({
        title: '답변 내용을 입력해주세요',
        variant: 'destructive',
      })
      return
    }
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/feedback/${params.id}`, {
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
      setFeedback(data.data)
      
      toast({
        title: '답변이 저장되었습니다',
        description: '피드백 답변이 성공적으로 저장되었습니다.',
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
  
  // 상태 텍스트 변환
  const getStatusText = (status: string): string => {
    switch(status) {
      case 'unread': return '읽지 않음'
      case 'read': return '검토중'
      case 'replied': return '답변완료'
      default: return status
    }
  }
  
  // 상태에 따른 배지 컴포넌트
  function StatusBadge({ status }: { status: string }) {
    switch(status) {
      case 'unread':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>읽지 않음</span>
        </Badge>
      case 'read':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>검토중</span>
        </Badge>
      case 'replied':
        return <Badge variant="default" className="flex items-center gap-1">
          <MailCheck className="h-3 w-3" />
          <span>답변완료</span>
        </Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // 로딩 상태 UI
  if (isLoading) {
    return (
      <div className="container p-4 mx-auto max-w-4xl">
        <Head>
          <title>피드백 상세 - LunchLab</title>
          <meta name="description" content="피드백 상세 정보 및 답변 관리" />
        </Head>
        
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-24 mr-4" />
          <Skeleton className="h-8 w-36 flex-1" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Separator />
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32 ml-auto" />
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // 에러 상태 UI
  if (error || !feedback) {
    return (
      <div className="container p-4 mx-auto max-w-4xl">
        <Head>
          <title>피드백 상세 - LunchLab</title>
          <meta name="description" content="피드백 상세 정보 및 답변 관리" />
        </Head>
        
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/admin/feedback')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold flex-1">피드백 상세</h1>
        </div>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || '피드백을 찾을 수 없습니다.'}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/feedback')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container p-4 mx-auto max-w-4xl">
      <Head>
        <title>피드백 상세 - LunchLab</title>
        <meta name="description" content="피드백 상세 정보 및 답변 관리" />
      </Head>
      
      {/* 헤더 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/admin/feedback')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <h1 className="text-2xl font-bold">피드백 상세</h1>
        </div>
        
        {/* 상태 변경 선택기 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">상태:</span>
          <Select
            value={feedback.status}
            onValueChange={updateFeedbackStatus}
            disabled={isSubmitting}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread" className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-destructive" />
                <span>읽지 않음</span>
              </SelectItem>
              <SelectItem value="read" className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-secondary-foreground" />
                <span>검토중</span>
              </SelectItem>
              <SelectItem value="replied" className="flex items-center gap-2">
                <MailCheck className="h-3.5 w-3.5 text-primary" />
                <span>답변완료</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 피드백 카드 */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {feedback.user_email ? feedback.user_email.charAt(0).toUpperCase() : 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {feedback.user_email ? (
                    <>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {feedback.user_email}
                    </>
                  ) : (
                    <>
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      익명 사용자
                    </>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(feedback.created_at)}
                </CardDescription>
              </div>
            </div>
            <StatusBadge status={feedback.status} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="border rounded-md p-6 bg-muted/30 whitespace-pre-wrap">
            {feedback.content}
          </div>
        </CardContent>
      </Card>
      
      {/* 답변 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MailCheck className="h-5 w-5" />
            답변 관리
          </CardTitle>
          <CardDescription>
            {feedback.status === 'replied' 
              ? '이 피드백에 대한 답변이 완료되었습니다.' 
              : '이 피드백에 대한 답변을 작성해주세요.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* 답변 이력 */}
          {feedback.reply && (
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  답변 내용
                </h3>
                <div className="text-xs text-muted-foreground">
                  {feedback.replied_at && formatDate(feedback.replied_at)}
                </div>
              </div>
              <div className="border border-primary/10 rounded-md p-4 bg-primary/5 whitespace-pre-wrap">
                {feedback.reply}
              </div>
            </div>
          )}
          
          {/* 답변 폼 */}
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reply" className="text-sm font-medium">
                {feedback.reply ? '답변 수정' : '답변 작성'}
              </label>
              <Textarea
                id="reply"
                placeholder="답변 내용을 입력하세요..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                className="resize-none"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/feedback')}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <MailCheck className="h-4 w-4" />
                    <span>{feedback.reply ? '답변 수정' : '답변 저장'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 