import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { isHeadAdmin } from '@/lib/clerk'
import { sendFeedbackNotificationEmail, type FeedbackData } from '@/lib/email'

export async function POST(req: Request) {
  try {
    // 인증된 사용자 확인
    const { userId } = await auth()
    
    // 요청 본문 파싱
    const body = await req.json()
    const { content, user_id, user_email } = body
    
    // 필수 필드 확인
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: '피드백 내용은 필수입니다.' }, { status: 400 })
    }
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient()
    
    // 피드백 저장
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        content,
        user_id: user_id || userId || null,
        user_email: user_email || null,
        status: 'unread',
      })
      .select()
    
    if (error) {
      console.error('피드백 저장 오류:', error)
      return NextResponse.json({ error: '피드백 저장 중 오류가 발생했습니다.' }, { status: 500 })
    }

    const savedFeedback = data[0]
    
    // 피드백 저장 성공 후 관리자들에게 이메일 알림 발송 (비동기, 실패해도 피드백 저장은 성공)
    if (savedFeedback) {
      // 이메일 발송을 백그라운드에서 처리 (에러가 발생해도 피드백 저장 성공 응답은 유지)
      sendFeedbackNotificationEmail(savedFeedback as FeedbackData)
        .then(() => {
          console.log(`피드백 ${savedFeedback.id}에 대한 관리자 알림 이메일 발송 완료`)
        })
        .catch((emailError) => {
          console.error(`피드백 ${savedFeedback.id}에 대한 관리자 알림 이메일 발송 실패:`, emailError)
          // 이메일 발송 실패는 로그만 남기고 사용자에게는 성공 응답 반환
        })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: savedFeedback 
    })
  } catch (error) {
    console.error('피드백 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    // 인증된 사용자 확인
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient()
    
    // 서비스 전체 관리자(headAdmin) 여부 확인
    const isAdmin = await isHeadAdmin(userId)
    
    console.log('GET 피드백 목록 - 사용자 권한:', isAdmin ? 'headAdmin' : 'not headAdmin', 'userId:', userId)
    
    // 관리자가 아닌 경우, 본인의 피드백만 조회 가능
    let query = supabase.from('feedbacks').select('*')
    
    if (!isAdmin) {
      query = query.eq('user_id', userId)
    }
    
    // 최신순으로 정렬
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) {
      console.error('피드백 조회 오류:', error)
      return NextResponse.json({ error: '피드백 조회 중 오류가 발생했습니다.' }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('피드백 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
} 