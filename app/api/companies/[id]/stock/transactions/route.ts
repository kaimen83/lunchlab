import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 거래 내역 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/transactions
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 거래 내역 목록
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
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
    const stockItemId = searchParams.get('stockItemId');
    const transactionType = searchParams.get('transactionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 회사의 재고 항목 ID 목록 가져오기
    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('id')
      .eq('company_id', companyId);

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const stockItemIds = stockItems.map(item => item.id);

    // 거래 내역 조회 쿼리 시작
    let query = supabase
      .from('stock_transactions')
      .select(`
        *,
        stock_item:stock_item_id(
          id, 
          item_type, 
          item_id
        )
      `, { count: 'exact' })
      .in('stock_item_id', stockItemIds);

    // 필터 적용
    if (stockItemId) {
      query = query.eq('stock_item_id', stockItemId);
    }

    if (transactionType && ['incoming', 'outgoing', 'disposal', 'adjustment'].includes(transactionType)) {
      query = query.eq('transaction_type', transactionType);
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    // 정렬 적용
    query = query.order('transaction_date', { ascending: false });

    // 페이지네이션 적용
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // 데이터 가져오기
    const { data: transactions, count, error } = await query;

    if (error) {
      console.error('거래 내역 조회 오류:', error);
      return NextResponse.json(
        { error: '거래 내역을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 항목 상세 정보 가져오기
    const transactionsWithDetails = await Promise.all(
      transactions.map(async (transaction) => {
        const stockItem = transaction.stock_item;
        let itemDetails = null;

        if (stockItem && typeof stockItem === 'object' && 'item_type' in stockItem) {
          if (stockItem.item_type === 'ingredient') {
            const { data: ingredient } = await supabase
              .from('ingredients')
              .select('id, name, unit')
              .eq('id', stockItem.item_id)
              .single();
            
            itemDetails = ingredient;
          } else if (stockItem.item_type === 'container') {
            const { data: container } = await supabase
              .from('containers')
              .select('id, name')
              .eq('id', stockItem.item_id)
              .single();
            
            itemDetails = container;
          }
        }

        return {
          ...transaction,
          itemDetails
        };
      })
    );

    // 응답 반환
    return NextResponse.json({
      transactions: transactionsWithDetails,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    console.error('거래 내역 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 거래 요청 생성 API
 * 
 * @route POST /api/companies/[id]/stock/transactions
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 생성된 거래 요청 정보
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
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

    // 요청 본문 파싱
    const requestData = await request.json();
    const { 
      stockItemIds, 
      quantities, 
      requestType, 
      notes = '', 
      referenceId = null, 
      referenceType = null 
    } = requestData;

    // 요청 유효성 검사
    if (!stockItemIds || !quantities || !requestType || !Array.isArray(stockItemIds) || !Array.isArray(quantities)) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었거나 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (!['incoming', 'outgoing', 'disposal'].includes(requestType)) {
      return NextResponse.json(
        { error: '유효하지 않은 요청 유형입니다.' },
        { status: 400 }
      );
    }

    if (stockItemIds.length !== quantities.length) {
      return NextResponse.json(
        { error: '항목 ID와 수량의 개수가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 모든 항목이 이 회사의 소유인지 확인
    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('id, company_id')
      .in('id', stockItemIds);

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const invalidItems = stockItems.filter(item => item.company_id !== companyId);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: '일부 항목이 이 회사에 속하지 않습니다.' },
        { status: 403 }
      );
    }

    // 관리자/소유자는 직접 처리, 일반 사용자는 승인 요청 생성
    const isAdminOrOwner = membership.role === 'admin' || membership.role === 'owner';
    
    // 트랜잭션 시작
    if (isAdminOrOwner && requestData.directProcess === true) {
      // 관리자/소유자가 직접 처리하는 경우
      const transactionPromises = stockItemIds.map(async (stockItemId, index) => {
        const quantity = quantities[index];
        
        // 거래 내역 생성
        const { data: transaction, error: transactionError } = await supabase
          .from('stock_transactions')
          .insert({
            stock_item_id: stockItemId,
            transaction_type: requestType,
            quantity,
            transaction_date: new Date().toISOString(),
            user_id: userId,
            reference_id: referenceId,
            reference_type: referenceType,
            notes
          })
          .select()
          .single();

        if (transactionError) {
          throw new Error(`거래 내역 생성 오류: ${transactionError.message}`);
        }

        // 재고 수량 업데이트
        const { data: stockItem } = await supabase
          .from('stock_items')
          .select('current_quantity')
          .eq('id', stockItemId)
          .single();
        
        let newQuantity;
        
        if (requestType === 'incoming') {
          newQuantity = Number(stockItem.current_quantity) + Number(quantity);
        } else if (requestType === 'outgoing' || requestType === 'disposal') {
          newQuantity = Math.max(0, Number(stockItem.current_quantity) - Number(quantity));
        }

        const { error: updateError } = await supabase
          .from('stock_items')
          .update({ 
            current_quantity: newQuantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', stockItemId);

        if (updateError) {
          throw new Error(`재고 수량 업데이트 오류: ${updateError.message}`);
        }

        return transaction;
      });

      try {
        const transactions = await Promise.all(transactionPromises);
        return NextResponse.json({
          success: true,
          message: '거래가 성공적으로 처리되었습니다.',
          transactions
        });
      } catch (err: any) {
        console.error('거래 처리 오류:', err);
        return NextResponse.json(
          { error: `거래 처리 중 오류가 발생했습니다: ${err.message}` },
          { status: 500 }
        );
      }
    } else {
      // 일반 사용자 또는 승인 요청을 생성하는 경우
      // 승인 요청 생성
      const { data: approvalRequest, error: approvalRequestError } = await supabase
        .from('stock_approval_requests')
        .insert({
          company_id: companyId,
          request_type: requestType,
          status: 'pending',
          requested_by: userId,
          notes
        })
        .select()
        .single();

      if (approvalRequestError) {
        console.error('승인 요청 생성 오류:', approvalRequestError);
        return NextResponse.json(
          { error: '승인 요청을 생성하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 승인 요청 항목 생성
      const approvalItems = stockItemIds.map((stockItemId, index) => ({
        approval_request_id: approvalRequest.id,
        stock_item_id: stockItemId,
        quantity: quantities[index],
        notes: notes
      }));

      const { error: approvalItemsError } = await supabase
        .from('stock_approval_items')
        .insert(approvalItems);

      if (approvalItemsError) {
        console.error('승인 요청 항목 생성 오류:', approvalItemsError);
        return NextResponse.json(
          { error: '승인 요청 항목을 생성하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 응답 반환
      return NextResponse.json({
        success: true,
        message: '승인 요청이 성공적으로 생성되었습니다.',
        approvalRequest
      });
    }
  } catch (error: any) {
    console.error('거래 요청 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 