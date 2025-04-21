import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { isHeadAdmin } from '@/lib/clerk'

// 특정 피드백 조회
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { id: feedbackId } = await params

    // 서비스 관리자(headAdmin) 여부 확인
    const isAdmin = await isHeadAdmin(userId)

    // 디버깅을 위한 로깅
    console.log('GET - 사용자 권한 정보:', isAdmin ? 'headAdmin' : 'not headAdmin', 'userId:', userId)

    // 피드백 조회
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('id', feedbackId)
      .maybeSingle()

    if (error) {
      console.error('피드백 조회 오류:', error)
      return NextResponse.json({ error: '피드백을 찾을 수 없습니다.' }, { status: 404 })
    }
    
    if (!data) {
      return NextResponse.json({ error: '피드백을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 서비스 관리자가 아니고, 본인의 피드백이 아니면 접근 거부
    if (!isAdmin && data.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('피드백 상세 조회 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

// 피드백 업데이트 (상태 변경 또는 답변)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { id: feedbackId } = await params
    
    // 요청 본문 확인
    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error('요청 본문 파싱 오류:', error)
      return NextResponse.json({ 
        error: '잘못된 요청 형식입니다.', 
        details: '유효한 JSON 형식이 아닙니다.' 
      }, { status: 400 })
    }

    console.log('PATCH 요청 본문:', body, '피드백 ID:', feedbackId)
    
    // 피드백 존재 여부 확인
    const { data: existingFeedback, error: existingError } = await supabase
      .from('feedbacks')
      .select('id')
      .eq('id', feedbackId)
      .maybeSingle()
    
    if (existingError) {
      console.error('피드백 존재 확인 오류:', existingError)
      return NextResponse.json({
        error: '피드백 확인 중 오류가 발생했습니다.',
        details: existingError.message
      }, { status: 500 })
    }
    
    if (!existingFeedback) {
      return NextResponse.json({ error: '해당 피드백이 존재하지 않습니다.' }, { status: 404 })
    }
    
    // 서비스 관리자(headAdmin) 여부 확인
    const isAdmin = await isHeadAdmin(userId)

    // 디버깅을 위한 로깅
    console.log('PATCH - 사용자 권한 정보:', isAdmin ? 'headAdmin' : 'not headAdmin', 'userId:', userId)

    // 서비스 관리자만 피드백을 업데이트할 수 있음
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자만 피드백을 수정할 수 있습니다.' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    
    // 상태 업데이트
    if (body.status) {
      // 상태 유효성 검사
      const validStatuses = ['unread', 'read', 'replied']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ 
          error: '잘못된 상태 값입니다.', 
          details: `유효한 상태 값: ${validStatuses.join(', ')}` 
        }, { status: 400 })
      }
      
      updateData.status = body.status
    }
    
    // 답변 업데이트
    if (body.reply) {
      if (typeof body.reply !== 'string') {
        return NextResponse.json({ 
          error: '답변은 문자열 형식이어야 합니다.' 
        }, { status: 400 })
      }
      
      updateData.reply = body.reply
      updateData.replied_at = new Date().toISOString()
      updateData.replied_by = userId
      updateData.status = 'replied' // 답변이 추가되면 상태를 'replied'로 변경
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '업데이트할 내용이 없습니다.' }, { status: 400 })
    }

    console.log('업데이트할 데이터:', updateData)

    // 피드백 업데이트
    const { data, error } = await supabase
      .from('feedbacks')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('피드백 업데이트 오류:', error)
      return NextResponse.json({ 
        error: '피드백 업데이트 중 오류가 발생했습니다.',
        details: error.message
      }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: '업데이트할 피드백을 찾을 수 없습니다.' }, { status: 404 })
    }

    console.log('피드백 업데이트 성공:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('피드백 업데이트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
} 