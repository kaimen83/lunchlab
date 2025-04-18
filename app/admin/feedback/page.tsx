import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, MessageSquare } from 'lucide-react'

export const metadata: Metadata = {
  title: '피드백 관리 - LunchLab',
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

export default async function AdminFeedbackPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  const supabase = createServerSupabaseClient()
  
  // 관리자 여부 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  
  if (!membership) {
    redirect('/')
  }
  
  // 피드백 목록 가져오기
  const { data: feedbacks, error } = await supabase
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('피드백 조회 오류:', error)
    return <div>피드백 조회 중 오류가 발생했습니다.</div>
  }

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-6">피드백 관리</h1>
      
      {feedbacks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">아직 접수된 피드백이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((feedback: Feedback) => (
            <Card key={feedback.id}>
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
                    asChild
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1"
                  >
                    <Link href={`/admin/feedback/${feedback.id}`}>
                      <Eye className="h-4 w-4" />
                      <span>상세보기</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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