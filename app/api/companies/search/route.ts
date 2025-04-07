import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Company } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 쿼리 파라미터 추출
    const query = req.nextUrl.searchParams.get('q') || '';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    
    // 검색어가 없으면 빈 결과 반환
    if (!query.trim()) {
      return NextResponse.json({ companies: [], total: 0 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 회사 검색 쿼리 - 이름이나 설명에 검색어 포함된 회사 검색
    const { data: companies, error, count } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${query}%, description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('회사 검색 오류:', error);
      return NextResponse.json({ error: '회사 검색에 실패했습니다.' }, { status: 500 });
    }
    
    if (!companies || companies.length === 0) {
      return NextResponse.json({ companies: [], total: 0 });
    }
    
    // 사용자가 이미 속한 회사인지 확인
    const { data: memberships, error: membershipError } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('user_id', userId);
    
    if (membershipError) {
      console.error('멤버십 확인 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버십 확인에 실패했습니다.' }, { status: 500 });
    }
    
    const memberCompanyIds = memberships?.map(m => m.company_id) || [];
    
    // 가입 신청 중인 회사인지 확인
    const { data: joinRequests, error: joinRequestError } = await supabase
      .from('company_join_requests')
      .select('company_id, status')
      .eq('user_id', userId);
    
    if (joinRequestError) {
      console.error('가입 신청 확인 오류:', joinRequestError);
      return NextResponse.json({ error: '가입 신청 확인에 실패했습니다.' }, { status: 500 });
    }
    
    // 회사별 가입 상태 확인
    const companiesWithStatus = companies.map((company: Company) => {
      // 이미 회사 멤버인 경우
      if (memberCompanyIds.includes(company.id)) {
        return { ...company, status: 'member' };
      }
      
      // 가입 신청 중인 경우
      const joinRequest = joinRequests?.find(req => req.company_id === company.id);
      if (joinRequest) {
        return { ...company, status: joinRequest.status };
      }
      
      // 가입하지 않은 경우
      return { ...company, status: 'none' };
    });
    
    return NextResponse.json({ 
      companies: companiesWithStatus, 
      total: count
    });
  } catch (error) {
    console.error('회사 검색 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 