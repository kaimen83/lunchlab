import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CreateStockAuditRequest, StockAuditListResponse } from '@/types/stock-audit';

/**
 * 재고 실사 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/audits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
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

    // 쿼리 파라미터 처리
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');

    // 실사 목록 조회
    let query = supabase
      .from('stock_audits')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // 상태 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: audits, error: auditsError, count } = await query;

    if (auditsError) {
      console.error('실사 목록 조회 오류:', auditsError);
      return NextResponse.json(
        { error: '실사 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const response: StockAuditListResponse = {
      audits: audits || [],
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('실사 목록 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 새로운 재고 실사 생성 API
 * 
 * @route POST /api/companies/[id]/stock/audits
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
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

    // 요청 본문 파싱
    const body: CreateStockAuditRequest = await request.json();
    const { name, description, item_types = ['ingredient', 'container'] } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '실사명을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작: 실사 세션 생성 + 실사 항목 생성
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .insert({
        company_id: companyId,
        name: name.trim(),
        description: description?.trim(),
        created_by: userId,
        status: 'in_progress'
      })
      .select()
      .single();

    if (auditError) {
      console.error('실사 세션 생성 오류:', auditError);
      return NextResponse.json(
        { 
          error: '실사 세션을 생성하는데 실패했습니다.',
          details: auditError.message 
        },
        { status: 500 }
      );
    }

    // 현재 재고 항목들을 조회 (모든 항목 포함)
    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('id, item_type, item_id, current_quantity, unit')
      .eq('company_id', companyId)
      .in('item_type', item_types); // 모든 재고 항목 포함

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { 
          error: '재고 항목을 조회하는데 실패했습니다.',
          details: stockItemsError.message 
        },
        { status: 500 }
      );
    }

    console.log(`실사 생성: 회사 ${companyId}에서 ${stockItems?.length || 0}개 재고 항목 조회됨`);
    console.log(`항목 타입별 분포:`, stockItems?.reduce((acc, item) => {
      acc[item.item_type] = (acc[item.item_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    if (!stockItems || stockItems.length === 0) {
      console.log('재고 항목이 없어서 빈 실사 생성');
      return NextResponse.json({
        audit,
        items_count: 0
      }, { status: 201 });
    }

    // 식자재와 용기 ID 분리
    const ingredientIds = stockItems
      .filter(item => item.item_type === 'ingredient')
      .map(item => item.item_id);
    
    const containerIds = stockItems
      .filter(item => item.item_type === 'container')
      .map(item => item.item_id);

    // 식자재 정보 조회
    let ingredientsMap = new Map();
    if (ingredientIds.length > 0) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name')
        .in('id', ingredientIds);
      
      if (ingredientsError) {
        console.error('식자재 정보 조회 오류:', ingredientsError);
      } else {
        ingredients?.forEach(ingredient => {
          ingredientsMap.set(ingredient.id, ingredient.name);
        });
      }
    }

    // 용기 정보 조회
    let containersMap = new Map();
    if (containerIds.length > 0) {
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('id, name')
        .in('id', containerIds);
      
      if (containersError) {
        console.error('용기 정보 조회 오류:', containersError);
      } else {
        containers?.forEach(container => {
          containersMap.set(container.id, container.name);
        });
      }
    }

    // 실사 항목 데이터 준비
    const auditItems = stockItems.map(item => ({
      audit_id: audit.id,
      stock_item_id: item.id,
      item_name: item.item_type === 'ingredient' 
        ? ingredientsMap.get(item.item_id) || '알 수 없는 식자재'
        : containersMap.get(item.item_id) || '알 수 없는 용기',
      item_type: item.item_type,
      unit: item.unit,
      book_quantity: item.current_quantity,
      status: 'pending'
    }));

    // 실사 항목들 일괄 생성
    if (auditItems.length > 0) {
      console.log(`${auditItems.length}개 실사 항목 생성 시도`);
      
      const { error: itemsError } = await supabase
        .from('stock_audit_items')
        .insert(auditItems);

      if (itemsError) {
        console.error('실사 항목 생성 오류:', itemsError);
        // 실사 세션도 삭제
        await supabase
          .from('stock_audits')
          .delete()
          .eq('id', audit.id);

        return NextResponse.json(
          { 
            error: '실사 항목을 생성하는데 실패했습니다.',
            details: itemsError.message 
          },
          { status: 500 }
        );
      }
      
      console.log(`실사 항목 생성 완료: ${auditItems.length}개`);
    }

    return NextResponse.json({
      audit,
      items_count: auditItems.length
    }, { status: 201 });

  } catch (error) {
    console.error('실사 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 