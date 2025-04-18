import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

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
    
    return NextResponse.json({ 
      success: true, 
      data: data[0] 
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
    
    // 사용자가 관리자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
    
    if (membershipError) {
      console.error('회원 권한 확인 오류:', membershipError)
      return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 })
    }
    
    // 관리자가 아닌 경우, 본인의 피드백만 조회 가능
    let query = supabase.from('feedbacks').select('*')
    
    if (!membership) {
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