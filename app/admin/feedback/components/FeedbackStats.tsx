"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Feedback } from "./FeedbackTable"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Eye, MailCheck } from "lucide-react"

interface FeedbackStatsProps {
  feedbacks: Feedback[]
}

export default function FeedbackStats({ feedbacks }: FeedbackStatsProps) {
  // 상태별 피드백 수 계산
  const totalCount = feedbacks.length
  const unreadCount = feedbacks.filter(f => f.status === 'unread').length
  const readCount = feedbacks.filter(f => f.status === 'read').length
  const repliedCount = feedbacks.filter(f => f.status === 'replied').length

  // 오늘 작성된 피드백 수 계산
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayCount = feedbacks.filter(f => new Date(f.created_at) >= today).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* 전체 피드백 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">전체 피드백</p>
            <h3 className="text-2xl font-bold">{totalCount}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 읽지 않은 피드백 */}
      <Card className={unreadCount > 0 ? "border-destructive shadow-sm" : ""}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <MessageSquare className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground font-medium">읽지 않음</p>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs h-5">{unreadCount}</Badge>
              )}
            </div>
            <h3 className="text-2xl font-bold">{unreadCount}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 검토중인 피드백 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-secondary/20 p-3 rounded-full">
            <Eye className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">검토중</p>
            <h3 className="text-2xl font-bold">{readCount}</h3>
          </div>
        </CardContent>
      </Card>

      {/* 답변 완료된 피드백 */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <MailCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">답변완료</p>
            <h3 className="text-2xl font-bold">{repliedCount}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 