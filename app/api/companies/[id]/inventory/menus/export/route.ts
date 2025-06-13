import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { utils, write } from 'xlsx';

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

    // 메뉴 목록 조회 (용기 정보 포함)
    const { data: menus, error: menusError } = await supabase
      .from("menus")
      .select(`
        *,
        menu_containers (
          container:containers (
            name,
            price
          )
        )
      `)
      .eq("company_id", companyId)
      .order("name");

    if (menusError) {
      return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
    }

    // 엑셀 데이터 구성
    const excelData = [
      ['메뉴명', '설명', '레시피', '총 원가(원)', '용기 구성', '등록일'],
      ...(menus || []).map(menu => {
        // 용기 정보 구성
        const containers = menu.menu_containers?.map((mc: any) => 
          `${mc.container?.name}(${mc.container?.price || 0}원)`
        ).join(', ') || '';
        
        return [
          menu.name || '',
          menu.description || '',
          menu.recipe || '',
          menu.cost || '',
          containers,
          menu.created_at ? new Date(menu.created_at).toLocaleDateString('ko-KR') : ''
        ];
      })
    ];

    // 워크시트 및 워크북 생성
    const ws = utils.aoa_to_sheet(excelData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '메뉴목록');

    // 컬럼 너비 설정
    ws['!cols'] = [
      { width: 20 }, // 메뉴명
      { width: 25 }, // 설명
      { width: 30 }, // 레시피
      { width: 12 }, // 총 원가
      { width: 25 }, // 용기 구성
      { width: 12 }  // 등록일
    ];

    // 엑셀 파일 생성
    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
    const companyName = company?.name || '회사';
    const fileName = `${companyName}_메뉴목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("메뉴 엑셀 다운로드 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 