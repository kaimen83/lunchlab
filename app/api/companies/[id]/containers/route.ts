import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 컨테이너 가져오기
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('컨테이너 로딩 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 새 컨테이너 추가
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.name) {
      return NextResponse.json(
        { error: '용기 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('containers')
      .insert({
        company_id: companyId,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('컨테이너 추가 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
} 