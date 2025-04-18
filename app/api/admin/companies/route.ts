import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import { createClient } from '@/utils/supabase/server';

// GET: 회사 목록 가져오기
export async function GET(req: NextRequest) {
  // 현재 인증된 사용자 확인
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }
  
  // 관리자 권한 확인
  const isAdmin = await isHeadAdmin(userId);
  
  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  
  try {
    // Supabase 클라이언트 생성
    const supabase = createClient();
    
    // 회사 목록 조회
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('회사 목록 조회 오류:', error);
      return NextResponse.json({ error: '회사 목록을 가져오는 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('회사 관리 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 