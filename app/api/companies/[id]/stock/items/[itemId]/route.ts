import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 특정 재고 항목 상세 조회 API
 * 
 * @route GET /api/companies/[id]/stock/items/[itemId]
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID, 재고 항목 ID)
 * @returns 재고 항목 상세 정보
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id: companyId, itemId } = params;
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

    // 재고 항목 조회
    const { data: stockItem, error: stockItemError } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', itemId)
      .eq('company_id', companyId)
      .single();

    if (stockItemError) {
      return NextResponse.json(
        { error: '재고 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 항목 유형에 따라 추가 데이터 가져오기
    let itemDetails = null;
    
    if (stockItem.item_type === 'ingredient') {
      const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', stockItem.item_id)
        .single();
      
      if (ingredientError) {
        console.error('식재료 조회 오류:', ingredientError);
      } else {
        itemDetails = ingredient;
      }
    } else if (stockItem.item_type === 'container') {
      const { data: container, error: containerError } = await supabase
        .from('containers')
        .select('*')
        .eq('id', stockItem.item_id)
        .single();
      
      if (containerError) {
        console.error('용기 조회 오류:', containerError);
      } else {
        itemDetails = container;
      }
    }

    // 최근 거래 내역 가져오기
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('stock_item_id', itemId)
      .order('transaction_date', { ascending: false })
      .limit(10);

    if (transactionsError) {
      console.error('거래 내역 조회 오류:', transactionsError);
    }

    // 응답 반환
    return NextResponse.json({
      item: {
        ...stockItem,
        details: itemDetails,
        recentTransactions: recentTransactions || []
      }
    });
  } catch (error) {
    console.error('재고 항목 상세 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 