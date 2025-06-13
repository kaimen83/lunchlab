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

    // 식재료 목록 조회 (모든 칼럼 포함)
    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select(`
        id,
        name,
        code_name,
        supplier,
        supplier_id,
        package_amount,
        unit,
        price,
        items_per_box,
        stock_grade,
        memo1,
        origin,
        calories,
        protein,
        fat,
        carbs,
        allergens,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .order("name");

    if (ingredientsError) {
      return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });
    }

    // 공급업체 정보도 조회하여 ID 대신 이름으로 표시
    const supplierIds = [...new Set(ingredients?.map(item => item.supplier_id).filter(Boolean))];
    let suppliersMap = new Map();
    
    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, name")
        .in("id", supplierIds);
      
      if (suppliers) {
        suppliersMap = new Map(suppliers.map(s => [s.id, s.name]));
      }
    }

    // 엑셀 데이터 구성 (모든 칼럼 포함)
    const excelData = [
      [
        '식재료명', 
        '코드명', 
        '공급업체', 
        '포장량', 
        '단위', 
        '단가(원)', 
        '박스당 갯수',
        '재고등급',
        '원산지',
        '칼로리',
        '단백질(g)',
        '지방(g)',
        '탄수화물(g)',
        '알러지 유발물질',
        '메모1', 
        '등록일',
        '수정일'
      ],
      ...(ingredients || []).map(item => [
        item.name || '', // 식재료명
        item.code_name || '', // 코드명
        item.supplier || suppliersMap.get(item.supplier_id) || '', // 공급업체 (supplier 필드 우선, 없으면 supplier_id로 조회)
        item.package_amount || '', // 포장량
        item.unit || '', // 단위
        item.price || '', // 단가
        item.items_per_box || '', // 박스당 갯수
        item.stock_grade || '', // 재고등급
        item.origin || '', // 원산지
        item.calories || '', // 칼로리
        item.protein || '', // 단백질
        item.fat || '', // 지방
        item.carbs || '', // 탄수화물
        item.allergens || '', // 알러지 유발물질
        item.memo1 || '', // 메모1
        item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : '', // 등록일
        item.updated_at ? new Date(item.updated_at).toLocaleDateString('ko-KR') : '' // 수정일
      ])
    ];

    // 워크시트 및 워크북 생성
    const ws = utils.aoa_to_sheet(excelData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, '식재료목록');

    // 컬럼 너비 설정 (모든 칼럼에 대해)
    ws['!cols'] = [
      { width: 20 }, // 식재료명
      { width: 15 }, // 코드명
      { width: 15 }, // 공급업체
      { width: 10 }, // 포장량
      { width: 8 },  // 단위
      { width: 12 }, // 단가
      { width: 12 }, // 박스당 갯수
      { width: 10 }, // 재고등급
      { width: 15 }, // 원산지
      { width: 8 },  // 칼로리
      { width: 10 }, // 단백질
      { width: 8 },  // 지방
      { width: 10 }, // 탄수화물
      { width: 20 }, // 알러지 유발물질
      { width: 15 }, // 메모1
      { width: 12 }, // 등록일
      { width: 12 }  // 수정일
    ];

    // 엑셀 파일 생성
    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
    const companyName = company?.name || '회사';
    const fileName = `${companyName}_식재료목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("식재료 엑셀 다운로드 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 