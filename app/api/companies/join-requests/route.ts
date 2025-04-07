import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 요청 바디에서 정보 추출
    const body = await req.json();
    const { company_id, message } = body;
    
    if (!company_id) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 회사가 존재하는지 확인
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single();
    
    if (companyError || !company) {
      return NextResponse.json({ error: '존재하지 않는 회사입니다.' }, { status: 404 });
    }
    
    // 이미 회사 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', userId);
    
    if (membershipError) {
      console.error('멤버십 확인 오류:', membershipError);
      return NextResponse.json({ error: '멤버십 확인에 실패했습니다.' }, { status: 500 });
    }
    
    if (membership && membership.length > 0) {
      return NextResponse.json({ error: '이미 회사에 소속된 멤버입니다.' }, { status: 400 });
    }
    
    // 이미 가입 신청 중인지 확인
    const { data: existingRequests, error: requestCheckError } = await supabase
      .from('company_join_requests')
      .select('id, status')
      .eq('company_id', company_id)
      .eq('user_id', userId);
    
    if (requestCheckError) {
      console.error('가입 신청 확인 오류:', requestCheckError);
      return NextResponse.json({ error: '가입 신청 확인에 실패했습니다.' }, { status: 500 });
    }
    
    // 이미 대기 중인 가입 신청이 있는 경우
    if (existingRequests && existingRequests.length > 0) {
      const pendingRequest = existingRequests.find(req => req.status === 'pending');
      if (pendingRequest) {
        return NextResponse.json({ error: '이미 가입 신청이 진행 중입니다.' }, { status: 400 });
      }
      
      // 거절된 가입 신청이 있는 경우, 삭제하고 새로 신청
      await supabase
        .from('company_join_requests')
        .delete()
        .eq('company_id', company_id)
        .eq('user_id', userId);
    }
    
    // 가입 신청 생성
    const { data: joinRequest, error: joinRequestError } = await supabase
      .from('company_join_requests')
      .insert({
        company_id,
        user_id: userId,
        status: 'pending',
        message: message || null
      })
      .select()
      .single();
    
    if (joinRequestError) {
      console.error('가입 신청 생성 오류:', joinRequestError);
      return NextResponse.json({ error: '가입 신청에 실패했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '가입 신청이 성공적으로 접수되었습니다.',
      joinRequest
    }, { status: 201 });
  } catch (error) {
    console.error('가입 신청 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 