import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
    categoryId: string;
  }>;
}

// 카테고리 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, categoryId } = await context.params;
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: '카테고리 이름과 코드는 필수입니다.' },
        { status: 400 }
      );
    }

    // 이미 존재하는 코드인지 확인 (자기 자신 제외)
    const { data: existingCategory } = await supabase
      .from('container_categories')
      .select('id')
      .eq('company_id', companyId)
      .eq('code', body.code)
      .neq('id', categoryId)
      .maybeSingle();

    if (existingCategory) {
      return NextResponse.json(
        { error: '이미 사용 중인 카테고리 코드입니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('container_categories')
      .update({
        name: body.name,
        code: body.code,
      })
      .eq('id', categoryId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('카테고리 수정 오류:', error);
    return NextResponse.json(
      { error: '카테고리 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 카테고리 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, categoryId } = await context.params;
    const supabase = createServerSupabaseClient();

    // 이 카테고리를 사용하는 컨테이너가 있는지 확인
    const { count, error: countError } = await supabase
      .from('containers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('category', categoryId);

    if (countError) {
      throw countError;
    }

    // 사용 중인 카테고리라면 삭제 불가
    if (count && count > 0) {
      return NextResponse.json(
        { error: '이 카테고리를 사용 중인 용기가 있어 삭제할 수 없습니다.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('container_categories')
      .delete()
      .eq('id', categoryId)
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('카테고리 삭제 오류:', error);
    return NextResponse.json(
      { error: '카테고리 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 