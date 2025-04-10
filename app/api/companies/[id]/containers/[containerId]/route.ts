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

// 컨테이너 업데이트
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
        description: body.description || null,
        category: body.category || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', containerId)
      .eq('company_id', companyId) // 회사 ID 확인 (추가 보안)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('컨테이너 업데이트 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 업데이트에 실패했습니다.' },
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

    // 컨테이너가 실제 해당 회사 소유인지 확인
    const { data: containerData, error: checkError } = await supabase
      .from('containers')
      .select('id')
      .eq('id', containerId)
      .eq('company_id', companyId)
      .single();

    if (checkError || !containerData) {
      return NextResponse.json(
        { error: '컨테이너를 찾을 수 없거나 접근 권한이 없습니다.' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('containers')
      .delete()
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