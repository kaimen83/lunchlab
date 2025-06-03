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

    // 모든 등록된 항목들을 조회하여 실사 대상 결정
    let allItems = [];

    // 1. 식자재 항목 조회 (재고 정보와 함께)
    if (item_types.includes('ingredient')) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name, unit')
        .eq('company_id', companyId)
        .not('stock_grade', 'is', null); // 재고관리 등급이 있는 식자재만

      if (ingredientsError) {
        console.error('식자재 조회 오류:', ingredientsError);
        return NextResponse.json(
          { 
            error: '식자재를 조회하는데 실패했습니다.',
            details: ingredientsError.message 
          },
          { status: 500 }
        );
      }

      if (ingredients && ingredients.length > 0) {
        // 해당 식자재들의 재고 정보 조회
        const ingredientIds = ingredients.map(ing => ing.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .in('item_id', ingredientIds);

        if (stockError) {
          console.error('식자재 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '식자재 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 식자재 항목들을 실사 항목 형태로 변환
        for (const ingredient of ingredients) {
          const stockItem = stockItems?.find(stock => stock.item_id === ingredient.id);
          allItems.push({
            id: stockItem?.id || null,
            item_type: 'ingredient',
            item_id: ingredient.id,
            item_name: ingredient.name,
            unit: ingredient.unit || 'EA',
            current_quantity: stockItem?.current_quantity || 0,
            has_stock_record: !!stockItem
          });
        }
      }
    }

    // 2. 용기 항목 조회 (재고 정보와 함께)
    if (item_types.includes('container')) {
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('id, name, price')
        .eq('company_id', companyId);

      if (containersError) {
        console.error('용기 조회 오류:', containersError);
        return NextResponse.json(
          { 
            error: '용기를 조회하는데 실패했습니다.',
            details: containersError.message 
          },
          { status: 500 }
        );
      }

      if (containers && containers.length > 0) {
        // 해당 용기들의 재고 정보 조회
        const containerIds = containers.map(cont => cont.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', containerIds);

        if (stockError) {
          console.error('용기 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '용기 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 용기 항목들을 실사 항목 형태로 변환
        for (const container of containers) {
          const stockItem = stockItems?.find(stock => stock.item_id === container.id);
          allItems.push({
            id: stockItem?.id || null,
            item_type: 'container',
            item_id: container.id,
            item_name: container.name,
            unit: '개', // 용기는 기본적으로 '개' 단위
            current_quantity: stockItem?.current_quantity || 0,
            has_stock_record: !!stockItem
          });
        }
      }
    }

    console.log(`실사 생성: 회사 ${companyId}에서 ${allItems.length}개 항목 조회됨`);
    console.log(`항목 타입별 분포:`, allItems.reduce((acc, item) => {
      acc[item.item_type] = (acc[item.item_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    console.log(`재고 레코드 있는 항목: ${allItems.filter(item => item.has_stock_record).length}개`);
    console.log(`재고 레코드 없는 항목: ${allItems.filter(item => !item.has_stock_record).length}개`);

    if (allItems.length === 0) {
      console.log('등록된 항목이 없어서 빈 실사 생성');
      return NextResponse.json({
        audit,
        items_count: 0
      }, { status: 201 });
    }

    // 재고 레코드가 없는 항목들에 대해 stock_items 레코드 생성
    const itemsWithoutStock = allItems.filter(item => !item.has_stock_record);
    if (itemsWithoutStock.length > 0) {
      console.log(`${itemsWithoutStock.length}개 항목에 대해 재고 레코드 생성 중...`);
      
      const stockItemsToCreate = itemsWithoutStock.map(item => ({
        company_id: companyId,
        item_type: item.item_type,
        item_id: item.item_id,
        current_quantity: 0,
        unit: item.unit
      }));

      const { data: createdStockItems, error: stockItemsCreateError } = await supabase
        .from('stock_items')
        .insert(stockItemsToCreate)
        .select('id, item_type, item_id');

      if (stockItemsCreateError) {
        console.error('재고 레코드 생성 오류:', stockItemsCreateError);
        // 실사 세션도 삭제
        await supabase
          .from('stock_audits')
          .delete()
          .eq('id', audit.id);

        return NextResponse.json(
          { 
            error: '재고 레코드를 생성하는데 실패했습니다.',
            details: stockItemsCreateError.message 
          },
          { status: 500 }
        );
      }

      // 생성된 stock_item_id를 allItems에 업데이트
      if (createdStockItems) {
        for (const createdItem of createdStockItems) {
          const targetItem = allItems.find(item => 
            item.item_type === createdItem.item_type && 
            item.item_id === createdItem.item_id
          );
          if (targetItem) {
            targetItem.id = createdItem.id;
            targetItem.has_stock_record = true;
          }
        }
      }

      console.log(`재고 레코드 생성 완료: ${createdStockItems?.length || 0}개`);
    }

    // 실사 항목 데이터 준비
    const auditItems = allItems.map(item => ({
      audit_id: audit.id,
      stock_item_id: item.id, // 이제 모든 항목이 stock_item_id를 가짐
      item_name: item.item_name,
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