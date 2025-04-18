"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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
  const router = useRouter()
  const { user } = useClerk()
  
  // 피드백 데이터 로드
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
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
        toast({
          title: '오류가 발생했습니다',
          description: '피드백을 불러올 수 없습니다.',
          variant: 'destructive',
        })
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
    } catch (error) {
      console.error('상태 업데이트 오류:', error)
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
  
  if (isLoading) {
    return (
      <div className="container p-4 mx-auto">
        <div className="text-center py-10">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }
  
  if (!feedback) {
    return (
      <div className="container p-4 mx-auto">
        <div className="text-center py-10">
          <p>피드백을 찾을 수 없습니다.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/admin/feedback')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container p-4 mx-auto max-w-3xl">
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
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg flex items-center">
                {feedback.user_email ? (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {feedback.user_email}
                  </>
                ) : (
                  '익명 사용자'
                )}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {new Date(feedback.created_at).toLocaleString('ko-KR')}
              </div>
            </div>
            <StatusBadge status={feedback.status} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="border p-4 rounded-md bg-muted/30 mb-6 whitespace-pre-wrap">
            {feedback.content}
          </div>
          
          {feedback.status === 'replied' && (
            <div>
              <h3 className="text-md font-semibold mb-2">관리자 답변</h3>
              <div className="border border-primary/20 p-4 rounded-md bg-primary/5 whitespace-pre-wrap">
                {feedback.reply}
              </div>
              <div className="text-xs text-muted-foreground mt-2 text-right">
                {feedback.replied_at && new Date(feedback.replied_at).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
          
          {feedback.status !== 'replied' && (
            <form onSubmit={handleSubmitReply} className="space-y-4 mt-6">
              <h3 className="text-md font-semibold">답변 작성</h3>
              <Textarea
                placeholder="답변 내용을 입력하세요..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '답변 저장'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
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