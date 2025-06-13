import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { utils, write } from 'xlsx';

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
  children?: Container[];
  level?: number;
  path?: string;
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

// 트리 구조를 플랫한 배열로 변환 (계층 구조 유지)
function flattenTreeForExcel(containers: Container[]): Container[] {
  const flattened: Container[] = [];
  
  const addContainer = (container: Container, level: number = 0) => {
    flattened.push({
      ...container,
      level,
      path: level === 0 ? container.name : container.path
    });
    
    if (container.children && container.children.length > 0) {
      container.children.forEach(child => {
        addContainer(child, level + 1);
      });
    }
  };
  
  containers.forEach(container => addContainer(container));
  return flattened;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const companyId = resolvedParams.id;
    const supabase = createServerSupabaseClient();

    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 회사 정보 조회
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    // 모든 용기 목록 조회 (그룹과 아이템 모두 포함)
    const { data: containers, error: containersError } = await supabase
      .from("containers")
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
      .eq("company_id", companyId)
      .order("sort_order")
      .order("name");

    if (containersError) {
      return NextResponse.json({ error: "Failed to fetch containers" }, { status: 500 });
    }

    // 트리 구조로 변환 후 플랫하게 펼치기 (계층 구조 유지)
    const containerTree = buildContainerTree(containers as Container[]);
    const flattenedContainers = flattenTreeForExcel(containerTree);

    // 엑셀 데이터 구성 (그룹 구조를 반영한 직관적인 형태)
    const excelData = [
      [
        '구분',
        '용기명',
        '코드명',
        '소속그룹',
        '전체경로',
        '가격(원)',
        '설명',
        '정렬순서',
        '등록일',
        '수정일'
      ],
      ...flattenedContainers.map(item => [
        item.container_type === 'group' ? '그룹' : '용기', // 구분
        item.name || '', // 용기명
        item.code_name || '', // 코드명
        item.parent_container_id ? 
          containers.find(c => c.id === item.parent_container_id)?.name || '' : 
          (item.container_type === 'group' ? '-' : '미분류'), // 소속그룹
        item.path || item.name || '', // 전체경로
        item.container_type === 'item' ? (item.price || '') : '-', // 가격 (그룹은 가격이 없음)
        item.description || '', // 설명
        item.sort_order || 0, // 정렬순서
        item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : '', // 등록일
        item.updated_at ? new Date(item.updated_at).toLocaleDateString('ko-KR') : '' // 수정일
      ])
    ];

    // 워크시트 및 워크북 생성
    const ws = utils.aoa_to_sheet(excelData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '용기목록');

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 8 },  // 구분
      { width: 20 }, // 용기명
      { width: 15 }, // 코드명
      { width: 15 }, // 소속그룹
      { width: 25 }, // 전체경로
      { width: 12 }, // 가격
      { width: 30 }, // 설명
      { width: 10 }, // 정렬순서
      { width: 12 }, // 등록일
      { width: 12 }  // 수정일
    ];

    // 행별 스타일 적용을 위한 설정
    const range = utils.decode_range(ws['!ref']!);
    
    // 그룹 행에 배경색 적용 (연한 회색)
    for (let row = 1; row <= range.e.r; row++) {
      const typeCell = ws[utils.encode_cell({ r: row, c: 0 })];
      if (typeCell && typeCell.v === '그룹') {
        // 그룹 행의 셀들에 스타일 적용
        for (let col = 0; col <= range.e.c; col++) {
          const cellRef = utils.encode_cell({ r: row, c: col });
          if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
          
          // 셀 스타일 설정 (배경색)
          if (!ws[cellRef].s) ws[cellRef].s = {};
          ws[cellRef].s.fill = {
            fgColor: { rgb: 'F5F5F5' }
          };
        }
      }
    }

    // 엑셀 파일 생성
    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
    const companyName = company?.name || '회사';
    const fileName = `${companyName}_용기목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("용기 엑셀 다운로드 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 