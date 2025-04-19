import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

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

    // 관리자 여부 확인 - 여러 회사에 소속된 경우 처리
    const { data: memberships, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('user_id', userId)

    if (membershipError) {
      console.error('회원 권한 확인 오류:', membershipError)
      return NextResponse.json({ 
        error: '권한 확인 중 오류가 발생했습니다.', 
        details: membershipError.message 
      }, { status: 500 })
    }

    // 디버깅을 위한 로깅
    console.log('GET - 사용자 권한 정보:', memberships, 'userId:', userId)

    // 하나 이상의 회사에서 관리자 권한을 가지고 있는지 확인
    const isAdmin = memberships && memberships.some(membership => membership.role === 'admin')

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

    // 관리자가 아니고, 본인의 피드백이 아니면 접근 거부
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
    const body = await req.json()
    
    // 관리자 여부 확인 - 여러 회사에 소속된 경우 처리
    const { data: memberships, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('user_id', userId)

    if (membershipError) {
      console.error('회원 권한 확인 오류:', membershipError)
      return NextResponse.json({ 
        error: '권한 확인 중 오류가 발생했습니다.', 
        details: membershipError.message 
      }, { status: 500 })
    }

    // 디버깅을 위한 로깅
    console.log('PATCH - 사용자 권한 정보:', memberships, 'userId:', userId)

    // 하나 이상의 회사에서 관리자 권한을 가지고 있는지 확인
    const isAdmin = memberships && memberships.some(membership => membership.role === 'admin')
    
    // 관리자만 피드백을 업데이트할 수 있음
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자만 피드백을 수정할 수 있습니다.' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    
    // 상태 업데이트
    if (body.status) {
      updateData.status = body.status
    }
    
    // 답변 업데이트
    if (body.reply) {
      updateData.reply = body.reply
      updateData.replied_at = new Date().toISOString()
      updateData.replied_by = userId
      updateData.status = 'replied' // 답변이 추가되면 상태를 'replied'로 변경
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '업데이트할 내용이 없습니다.' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('피드백 업데이트 오류:', error)
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
} 