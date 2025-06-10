import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// Container 타입 정의 (계층 구조 지원)
interface Container {
  id: string;
  name: string;
  code_name?: string;
  description?: string;
  price?: number;
  company_id: string;
  container_type: 'group' | 'item';
  parent_container_id?: string;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  children?: Container[]; // 하위 용기들
  level?: number; // 계층 레벨
  path?: string; // 경로 (예: "냄비 > 냄비A")
}

// 플랫한 배열을 트리 구조로 변환하는 함수
function buildContainerTree(containers: Container[]): Container[] {
  const containerMap = new Map<string, Container>();
  const rootContainers: Container[] = [];

  // 모든 컨테이너를 맵에 저장하고 children 배열 초기화
  containers.forEach(container => {
    containerMap.set(container.id, {
      ...container,
      children: [],
      level: container.parent_container_id ? 1 : 0
    });
  });

  // 부모-자식 관계 설정 및 경로 생성
  containers.forEach(container => {
    const containerWithChildren = containerMap.get(container.id)!;
    
    if (container.parent_container_id) {
      // 하위 아이템
      const parent = containerMap.get(container.parent_container_id);
      if (parent) {
        parent.children!.push(containerWithChildren);
        containerWithChildren.path = `${parent.name} > ${container.name}`;
      }
    } else {
      // 루트 레벨 (그룹 또는 독립 아이템)
      rootContainers.push(containerWithChildren);
      containerWithChildren.path = container.name;
    }
  });

  // 정렬: 각 레벨에서 sort_order, 그 다음 name으로 정렬
  const sortContainers = (containers: Container[]) => {
    containers.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });
    
    containers.forEach(container => {
      if (container.children && container.children.length > 0) {
        sortContainers(container.children);
      }
    });
  };

  sortContainers(rootContainers);
  return rootContainers;
}

// 컨테이너 목록 가져오기 (트리 구조로 반환)
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: companyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const flat = searchParams.get('flat') === 'true'; // 플랫 구조로 반환할지 여부
    
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('containers')
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
      .eq('company_id', companyId)
      .order('sort_order')
      .order('name');

    if (error) {
      throw error;
    }

    if (flat) {
      // 플랫 구조로 반환 (기존 호환성)
      return NextResponse.json(data);
    }

    // 트리 구조로 변환해서 반환
    const containerTree = buildContainerTree(data as Container[]);
    return NextResponse.json(containerTree);
  } catch (error) {
    console.error('컨테이너 로딩 오류:', error);
    return NextResponse.json(
      { error: '컨테이너 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// 새 컨테이너 추가 (그룹 또는 아이템)
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

    // container_type 기본값 설정
    const containerType = body.container_type || 'item';
    
    // container_type 검증
    if (!['group', 'item'].includes(containerType)) {
      return NextResponse.json(
        { error: '용기 타입은 group 또는 item이어야 합니다.' },
        { status: 400 }
      );
    }

    // 부모 컨테이너 검증 (item인 경우)
    if (containerType === 'item' && body.parent_container_id) {
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

    const { data, error } = await supabase
      .from('containers')
      .insert({
        company_id: companyId,
        name: body.name,
        code_name: body.code_name || null,
        description: body.description || null,
        price: body.price || null,
        container_type: containerType,
        parent_container_id: body.parent_container_id || null,
        sort_order: body.sort_order || 0,
      })
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