import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
    containerId: string;
  }>;
}

// 컨테이너 가져오기
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, containerId } = await context.params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', containerId)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('컨테이너 로딩 오류:', error);
    return NextResponse.json(
      { error: '컨테이너를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 컨테이너 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, containerId } = await context.params;
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
      .update({
        name: body.name,
        code_name: body.code_name || null,
        description: body.description || null,
        category: body.category || null,
        price: body.price || null,
      })
      .eq('company_id', companyId)
      .eq('id', containerId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('컨테이너 수정 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 컨테이너 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, containerId } = await context.params;
    const supabase = createServerSupabaseClient();

    // 메뉴에서 이 컨테이너를 사용 중인지 확인
    const { count, error: countError } = await supabase
      .from('menu_containers')
      .select('*', { count: 'exact', head: true })
      .eq('container_id', containerId);

    if (countError) {
      throw countError;
    }

    // 사용 중인 컨테이너는 삭제 불가
    if (count && count > 0) {
      return NextResponse.json(
        { error: '이 용기는 하나 이상의 메뉴에서 사용 중이므로 삭제할 수 없습니다.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('containers')
      .delete()
      .eq('company_id', companyId)
      .eq('id', containerId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('컨테이너 삭제 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 