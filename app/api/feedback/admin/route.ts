import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { isHeadAdmin } from '@/lib/clerk'

/**
 * 관리자용 피드백 API 엔드포인트
 * 모든 피드백과 관련 사용자 정보를 효율적으로 한 번에 가져옴
 */
export async function POST(req: Request) {
  try {
    // 인증된 사용자 확인
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    
    // 관리자 권한 확인
    const isAdmin = await isHeadAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }
    
    // 요청 파라미터 파싱
    const body = await req.json()
    const { dateFilter } = body
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient()
    
    // 기본 쿼리 설정
    let query = supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
    
    // 날짜 필터 적용
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      const startOfDay = new Date(filterDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(filterDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      query = query
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
    }
    
    // 피드백 데이터 조회
    const { data: feedbacks, error } = await query
    
    if (error) {
      console.error('피드백 조회 오류:', error)
      return NextResponse.json({ error: '피드백 조회 중 오류가 발생했습니다.' }, { status: 500 })
    }
    
    // 사용자 ID가 있는 피드백에서 고유 사용자 ID 추출
    const uniqueUserIds = [...new Set(
      feedbacks
        .filter(feedback => feedback.user_id)
        .map(feedback => feedback.user_id)
    )]
    
    // 사용자 정보 일괄 조회
    let userMap: Record<string, any> = {}
    
    if (uniqueUserIds.length > 0) {
      try {
        // Clerk API를 통해 사용자 정보 조회
        const client = await clerkClient()
        const response = await client.users.getUserList({
          userId: uniqueUserIds
        })
        
        // 사용자 ID를 키로 하는 맵 생성
        userMap = response.data.reduce((acc: Record<string, any>, user) => {
          acc[user.id] = {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : (user.firstName || user.username || user.emailAddresses[0]?.emailAddress),
            username: user.username,
            imageUrl: user.imageUrl,
          }
          return acc
        }, {})
      } catch (error) {
        console.error('사용자 정보 조회 오류:', error)
        // 사용자 정보 조회 실패해도 피드백 데이터는 반환
      }
    }
    
    // 사용자 정보를 포함한 피드백 데이터 구성
    const feedbacksWithUserInfo = feedbacks.map(feedback => {
      if (feedback.user_id && userMap[feedback.user_id]) {
        return {
          ...feedback,
          user_name: userMap[feedback.user_id].name || feedback.user_email,
          user_info: userMap[feedback.user_id]
        }
      }
      return feedback
    })
    
    return NextResponse.json({ data: feedbacksWithUserInfo })
  } catch (error) {
    console.error('관리자 피드백 API 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
} 