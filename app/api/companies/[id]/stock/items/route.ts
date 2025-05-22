import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 재고 항목 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/items
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 재고 항목 목록
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    const { userId } = await auth();

    // 로그인하지 않은 경우 권한 없음
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // URL 쿼리 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams;
    const itemType = searchParams.get('itemType');
    const searchQuery = searchParams.get('query');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 재고 항목 조회 쿼리 시작
    let query = supabase
      .from('stock_items')
      .select(`
        id,
        company_id,
        item_type,
        item_id,
        current_quantity,
        unit,
        last_updated,
        created_at,
        items:item_id(id, name)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // 타입 필터 적용
    if (itemType && ['ingredient', 'container'].includes(itemType)) {
      query = query.eq('item_type', itemType);
    }

    // 검색어 필터 적용 (실제 검색은 item_id가 가리키는 테이블에서 수행해야 함)
    // 이 부분은 복잡하므로 프론트엔드에서 필터링하거나 
    // 이후 백엔드 로직에서 추가 필터링을 권장

    // 정렬 적용
    const validSortFields = ['created_at', 'current_quantity', 'last_updated'];
    if (validSortFields.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // 페이지네이션 적용
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // 데이터 가져오기
    const { data: stockItems, count, error } = await query;

    if (error) {
      console.error('재고 항목 조회 오류:', error);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 항목 유형에 따라 추가 데이터 가져오기
    const stockItemsWithDetails = await Promise.all(
      stockItems.map(async (item) => {
        if (item.item_type === 'ingredient') {
          const { data: ingredient } = await supabase
            .from('ingredients')
            .select('id, name, unit, supplier, code_name, stock_grade')
            .eq('id', item.item_id)
            .single();
          
          return {
            ...item,
            details: ingredient
          };
        } else if (item.item_type === 'container') {
          const { data: container } = await supabase
            .from('containers')
            .select('id, name, description, category, price, code_name')
            .eq('id', item.item_id)
            .single();
          
          return {
            ...item,
            details: container
          };
        }
        
        return item;
      })
    );

    // 응답 반환
    return NextResponse.json({
      items: stockItemsWithDetails,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    console.error('재고 항목 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 