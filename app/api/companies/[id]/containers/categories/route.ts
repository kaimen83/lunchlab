import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 컨테이너 카테고리 가져오기
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('container_categories')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('컨테이너 카테고리 로딩 오류:', error);
    return NextResponse.json(
      { error: '카테고리 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 새 카테고리 추가
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: '카테고리 이름과 코드는 필수입니다.' },
        { status: 400 }
      );
    }

    // 이미 존재하는 코드인지 확인
    const { data: existingCategory } = await supabase
      .from('container_categories')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', body.code)
      .maybeSingle();

    if (existingCategory) {
      return NextResponse.json(
        { error: '이미 사용 중인 카테고리 코드입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('container_categories')
      .insert({
        company_id: companyId,
        name: body.name,
        code: body.code,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('카테고리 추가 오류:', error);
    return NextResponse.json(
      { error: '카테고리 추가에 실패했습니다.' },
      { status: 500 }
    );
  }
} 