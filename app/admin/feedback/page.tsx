"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import FeedbackTable, { Feedback } from './components/FeedbackTable'
import FeedbackFilters from './components/FeedbackFilters'
import FeedbackStats from './components/FeedbackStats'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import Head from 'next/head'

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)
  const router = useRouter()
  const { user } = useClerk()
  
  // 관리자 여부 확인
  useEffect(() => {
    if (!user) {
      router.push('/sign-in')
      return
    }
    
    const checkAdminStatus = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase
          .from('company_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
          
        if (error) throw error
        if (!data) {
          router.push('/')
        }
      } catch (err) {
        console.error('권한 확인 오류:', err)
        router.push('/')
      }
    }
    
    checkAdminStatus()
  }, [user, router])
  
  // 피드백 목록 로드
  const loadFeedbacks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 피드백 데이터와 사용자 정보를 한 번에 가져오는 최적화된 API 호출
      const response = await fetch('/api/feedback/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateFilter: dateFilter ? dateFilter.toISOString() : null,
        })
      })
      
      if (!response.ok) {
        throw new Error('피드백 목록을 불러오는데 실패했습니다.')
      }
      
      const data = await response.json()
      setFeedbacks(data.data || [])
    } catch (err) {
      console.error('피드백 로드 오류:', err)
      setError('피드백 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 컴포넌트 마운트 시 피드백 로드
  useEffect(() => {
    loadFeedbacks()
  }, [dateFilter])
  
  // 필터링된 피드백 목록
  const filteredFeedbacks = statusFilter
    ? feedbacks.filter(feedback => feedback.status === statusFilter)
    : feedbacks
  
  // 에러 발생 시
  if (error) {
    return (
      <div className="container p-4 mx-auto space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container p-4 mx-auto">
      <Head>
        <title>피드백 관리 - LunchLab</title>
        <meta name="description" content="관리자 피드백 관리 페이지" />
      </Head>
      
      <h1 className="text-2xl font-bold mb-6">피드백 관리</h1>
      
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* 통계 정보 */}
          <FeedbackStats feedbacks={feedbacks} />
          
          {/* 필터 */}
          <FeedbackFilters
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            onRefresh={loadFeedbacks}
          />
          
          {/* 피드백 테이블 */}
          <FeedbackTable
            data={filteredFeedbacks}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          
          {/* 결과 없음 메시지 */}
          {filteredFeedbacks.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {feedbacks.length === 0
                  ? '아직 접수된 피드백이 없습니다.'
                  : '검색 조건에 맞는 피드백이 없습니다.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* 통계 로딩 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      
      {/* 필터 로딩 상태 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* 테이블 로딩 상태 */}
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
} 