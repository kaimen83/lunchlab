import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { clerkClient } from '@clerk/nextjs/server'

// Resend 클라이언트 초기화
const resend = new Resend(process.env.RESEND_API_KEY)

// 피드백 타입 정의
export interface FeedbackData {
  id: string
  content: string
  user_id: string | null
  user_email: string | null
  created_at: string
}

/**
 * 모든 관리자의 이메일 주소를 조회합니다.
 */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const supabase = createServerSupabaseClient()
    
    // company_memberships 테이블에서 관리자 역할을 가진 사용자 ID들 조회
    const { data: adminMemberships, error } = await supabase
      .from('company_memberships')
      .select('user_id')
      .eq('role', 'admin')
    
    if (error) {
      console.error('관리자 목록 조회 오류:', error)
      return []
    }
    
    if (!adminMemberships || adminMemberships.length === 0) {
      console.log('등록된 관리자가 없습니다.')
      return []
    }
    
    // Clerk에서 사용자 정보 조회
    const client = await clerkClient()
    const userIds = adminMemberships.map(membership => membership.user_id)
    
    // 여러 사용자 정보를 한 번에 조회
    const { data: users } = await client.users.getUserList({
      userId: userIds
    })
    
    // 이메일 주소 추출 (유효한 이메일만 필터링)
    const emails = users
      .map(user => user.emailAddresses[0]?.emailAddress)
      .filter((email): email is string => !!email)
    
    console.log(`관리자 이메일 ${emails.length}개 조회 완료:`, emails)
    return emails
    
  } catch (error) {
    console.error('관리자 이메일 조회 중 오류 발생:', error)
    return []
  }
}

/**
 * 피드백 알림 이메일의 HTML 템플릿을 생성합니다.
 */
function generateFeedbackEmailHTML(feedback: FeedbackData): string {
  const dashboardUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                      (process.env.NEXT_PUBLIC_VERCEL_URL 
                        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
                        : 'http://localhost:3000')
  
  const feedbackDetailUrl = `${dashboardUrl}/admin/feedback/${feedback.id}`
  const feedbackListUrl = `${dashboardUrl}/admin/feedback`
  
  const submittedAt = new Date(feedback.created_at).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul'
  })
  
  const truncatedContent = feedback.content.length > 200 
    ? `${feedback.content.substring(0, 200)}...` 
    : feedback.content

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>새로운 피드백 알림</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
        
        <!-- 헤더 -->
        <div style="background-color: #3b82f6; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">🍽️ LunchLab</h1>
          <p style="color: #bfdbfe; font-size: 14px; margin: 8px 0 0 0;">피드백 관리 시스템</p>
        </div>
        
        <!-- 메인 콘텐츠 -->
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">새로운 피드백이 접수되었습니다</h2>
          
          <!-- 피드백 정보 박스 -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 0 0 32px 0;">
            <div style="margin-bottom: 16px;">
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">제출자</p>
              <p style="color: #1f2937; font-size: 14px; margin: 0;">${feedback.user_email || '익명 사용자'}</p>
            </div>
            
            <div style="margin-bottom: 16px;">
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0;">제출 시간</p>
              <p style="color: #1f2937; font-size: 14px; margin: 0;">${submittedAt}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
            
            <div>
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">피드백 내용</p>
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; white-space: pre-wrap; line-height: 1.5;">
                <p style="color: #1f2937; font-size: 14px; margin: 0;">${truncatedContent}</p>
              </div>
            </div>
          </div>
          
          <!-- 액션 버튼 -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${feedbackDetailUrl}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 6px; font-size: 14px; display: inline-block; margin: 0 8px 12px 0;">
              피드백 상세보기
            </a>
            <a href="${feedbackListUrl}" style="background-color: #ffffff; color: #374151; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 6px; font-size: 14px; border: 1px solid #d1d5db; display: inline-block; margin: 0 8px 12px 0;">
              피드백 관리 페이지
            </a>
          </div>
          
          <!-- 안내 메시지 -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; font-size: 13px; margin: 0;">
              💡 이 피드백에 답변하려면 상세보기 페이지에서 답변을 작성해주세요.
            </p>
          </div>
        </div>
        
        <!-- 푸터 -->
        <div style="border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; background-color: #f9fafb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            이 이메일은 LunchLab 피드백 시스템에서 자동으로 발송되었습니다.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `
}

/**
 * 관리자들에게 피드백 알림 이메일을 발송합니다.
 */
export async function sendFeedbackNotificationEmail(feedback: FeedbackData): Promise<void> {
  try {
    // 관리자 이메일 목록 조회
    const adminEmails = await getAdminEmails()
    
    if (adminEmails.length === 0) {
      console.log('알림을 받을 관리자가 없습니다.')
      return
    }
    
    // 이메일 HTML 생성
    const emailHTML = generateFeedbackEmailHTML(feedback)
    
    // 각 관리자에게 개별적으로 이메일 발송
    const emailPromises = adminEmails.map(async (email) => {
      try {
        const result = await resend.emails.send({
          from: 'LunchLab <onboarding@resend.dev>', // Resend 테스트용 이메일 주소
          to: email,
          subject: '[LunchLab] 새로운 피드백이 접수되었습니다',
          html: emailHTML,
        })
        
        console.log(`피드백 알림 이메일 발송 성공 - ${email}:`, result.data?.id)
        return { email, success: true, id: result.data?.id }
      } catch (error) {
        console.error(`피드백 알림 이메일 발송 실패 - ${email}:`, error)
        return { email, success: false, error }
      }
    })
    
    // 모든 이메일 발송 결과 대기
    const results = await Promise.allSettled(emailPromises)
    
    // 결과 로깅
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length
    
    const failed = results.length - successful
    
    console.log(`피드백 알림 이메일 발송 완료 - 성공: ${successful}개, 실패: ${failed}개`)
    
    if (failed > 0) {
      console.error('일부 이메일 발송에 실패했습니다:', 
        results
          .filter(result => result.status === 'rejected' || 
                          (result.status === 'fulfilled' && !result.value.success))
          .map(result => result.status === 'rejected' ? result.reason : result.value)
      )
    }
    
  } catch (error) {
    console.error('피드백 알림 이메일 발송 중 오류 발생:', error)
    throw error
  }
} 