import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { CompanyMemberRole } from '@/lib/types';

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
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId, containerId } = await context.params;
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // 인증된 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }

    // 필수 필드 검증
    if (!body.name) {
      return NextResponse.json(
        { error: '용기 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    // container_type 기본값 설정 및 검증
    const containerType = body.container_type || 'item';
    
    if (!['group', 'item'].includes(containerType)) {
      return NextResponse.json(
        { error: '용기 타입은 group 또는 item이어야 합니다.' },
        { status: 400 }
      );
    }

    // 기존 컨테이너 정보 조회
    const { data: existingContainer, error: fetchError } = await supabase
      .from('containers')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', containerId)
      .single();

    if (fetchError || !existingContainer) {
      return NextResponse.json(
        { error: '수정할 용기를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 부모 컨테이너 검증 (item인 경우)
    if (containerType === 'item' && body.parent_container_id) {
      // 자기 자신을 부모로 설정하는 것 방지
      if (body.parent_container_id === containerId) {
        return NextResponse.json(
          { error: '자기 자신을 부모로 설정할 수 없습니다.' },
          { status: 400 }
        );
      }

      const { data: parentContainer, error: parentError } = await supabase
        .from('containers')
        .select('container_type')
        .eq('id', body.parent_container_id)
        .eq('company_id', companyId)
        .single();

      if (parentError || !parentContainer) {
        return NextResponse.json(
          { error: '유효하지 않은 부모 그룹입니다.' },
          { status: 400 }
        );
      }

      if (parentContainer.container_type !== 'group') {
        return NextResponse.json(
          { error: '부모는 반드시 그룹 타입이어야 합니다.' },
          { status: 400 }
        );
      }
    }

    // 그룹인 경우 parent_container_id는 null이어야 함
    if (containerType === 'group' && body.parent_container_id) {
      return NextResponse.json(
        { error: '그룹은 최상위 레벨에만 생성할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 그룹에서 아이템으로 변경하는 경우, 하위 아이템들이 있는지 확인
    if (existingContainer.container_type === 'group' && containerType === 'item') {
      const { count, error: countError } = await supabase
        .from('containers')
        .select('*', { count: 'exact', head: true })
        .eq('parent_container_id', containerId);

      if (countError) {
        throw countError;
      }

      if (count && count > 0) {
        return NextResponse.json(
          { error: '하위 용기가 있는 그룹은 개별 용기로 변경할 수 없습니다. 먼저 하위 용기들을 이동하거나 삭제해주세요.' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('containers')
      .update({
        name: body.name,
        code_name: body.code_name || null,
        description: body.description || null,
        price: body.price || null,
        container_type: containerType,
        parent_container_id: body.parent_container_id || null,
        sort_order: body.sort_order || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('id', containerId)
      .select(`
        id,
        name,
        code_name,
        description,
        price,
        company_id,
        container_type,
        parent_container_id,
        sort_order,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      // PostgreSQL 에러 메시지를 사용자 친화적으로 변환
      if (error.message.includes('용기 계층은 최대 2레벨까지만 허용됩니다')) {
        return NextResponse.json(
          { error: '용기 계층은 최대 2레벨까지만 허용됩니다.' },
          { status: 400 }
        );
      }
      if (error.message.includes('부모는 반드시 그룹 타입이어야 합니다')) {
        return NextResponse.json(
          { error: '부모는 반드시 그룹 타입이어야 합니다.' },
          { status: 400 }
        );
      }
      if (error.message.includes('그룹은 최상위 레벨에만 생성할 수 있습니다')) {
        return NextResponse.json(
          { error: '그룹은 최상위 레벨에만 생성할 수 있습니다.' },
          { status: 400 }
        );
      }
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
    
    // 인증된 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    // 사용자의 회사 내 역할 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      return NextResponse.json(
        { error: '회사 멤버십을 확인할 수 없습니다.' },
        { status: 403 }
      );
    }
    
    // 소유자 또는 관리자인지 확인
    const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';
    
    if (!isOwnerOrAdmin) {
      return NextResponse.json(
        { error: '컨테이너 삭제는 관리자 이상의 권한이 필요합니다.' },
        { status: 403 }
      );
    }

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