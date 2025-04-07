import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string; key: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', params.moduleId)
      .eq('key', params.key)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116: 결과가 없음
      console.error('설정 조회 오류:', error);
      return NextResponse.json(
        { error: '설정 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 값이 없는 경우 null 반환
    if (!data) {
      return NextResponse.json({ value: null });
    }
    
    // JSON 문자열을 파싱하여 반환
    let value = null;
    try {
      if (data.value) {
        value = JSON.parse(data.value);
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      value = data.value; // 파싱 실패 시 원본 문자열 반환
    }
    
    return NextResponse.json({ 
      id: data.id,
      key: data.key,
      value,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json(
      { error: '설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 