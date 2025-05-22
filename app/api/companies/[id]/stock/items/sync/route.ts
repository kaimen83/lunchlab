import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 재고 항목 인터페이스 정의
interface StockItem {
  company_id: string;
  item_type: 'ingredient' | 'container';
  item_id: string;
  current_quantity: number;
  unit: string;
  created_by: string;
}

/**
 * 식자재와 용기를 재고 항목으로 자동 동기화하는 API
 * - 재고관리 등급이 "나"인 모든 식자재를 재고 항목으로 추가
 * - 모든 용기를 재고 항목으로 추가
 *
 * @route POST /api/companies/[id]/stock/items/sync
 * @param request - 요청 객체
 * @param params - URL 파라미터 (회사 ID)
 * @returns 동기화 결과
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15에서는 params가 Promise이므로 await로 처리
    const resolvedParams = await params;
    const companyId = resolvedParams.id;
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

    // 1. 재고관리 등급이 "나"인 식자재 조회
    const { data: gradeAIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id, name, unit')
      .eq('company_id', companyId)
      .eq('stock_grade', '나');

    if (ingredientsError) {
      console.error('식자재 조회 오류:', ingredientsError);
      return NextResponse.json(
        { error: '식자재를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 2. 모든 용기 조회
    const { data: containers, error: containersError } = await supabase
      .from('containers')
      .select('id, name')
      .eq('company_id', companyId);

    if (containersError) {
      console.error('용기 조회 오류:', containersError);
      return NextResponse.json(
        { error: '용기를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 3. 기존 재고 항목 조회
    const { data: existingStockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('item_type, item_id')
      .eq('company_id', companyId);

    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목을 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 이미 등록된 항목의 ID를 유형별로 맵으로 저장
    const existingItemsMap = {
      ingredient: new Set<string>(),
      container: new Set<string>(),
    };

    existingStockItems?.forEach(item => {
      if (item.item_type === 'ingredient') {
        existingItemsMap.ingredient.add(item.item_id);
      } else if (item.item_type === 'container') {
        existingItemsMap.container.add(item.item_id);
      }
    });

    // 4. 신규 항목 생성 준비
    const newStockItems: StockItem[] = [];

    // 식자재 항목 추가
    gradeAIngredients?.forEach(ingredient => {
      // 이미 등록된 항목이 아닌 경우만 추가
      if (!existingItemsMap.ingredient.has(ingredient.id)) {
        newStockItems.push({
          company_id: companyId,
          item_type: 'ingredient',
          item_id: ingredient.id,
          current_quantity: 0,
          unit: ingredient.unit,
          created_by: userId,
        });
      }
    });

    // 용기 항목 추가
    containers?.forEach(container => {
      // 이미 등록된 항목이 아닌 경우만 추가
      if (!existingItemsMap.container.has(container.id)) {
        newStockItems.push({
          company_id: companyId,
          item_type: 'container',
          item_id: container.id,
          current_quantity: 0,
          unit: '개', // 용기의 기본 단위는 '개'로 설정
          created_by: userId,
        });
      }
    });

    // 5. 새 항목이 있는 경우 일괄 삽입
    let insertResult = { count: 0 };
    
    if (newStockItems.length > 0) {
      const { data, error: insertError } = await supabase
        .from('stock_items')
        .insert(newStockItems)
        .select();

      if (insertError) {
        console.error('재고 항목 생성 오류:', insertError);
        return NextResponse.json(
          { error: '재고 항목을 생성하는 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      insertResult.count = data?.length || 0;
    }

    // 6. 결과 반환
    return NextResponse.json({
      success: true,
      message: '재고 항목 동기화가 완료되었습니다.',
      added: insertResult.count,
      details: {
        totalIngredientsFound: gradeAIngredients?.length || 0,
        totalContainersFound: containers?.length || 0,
        newItemsAdded: insertResult.count,
      }
    });
    
  } catch (error) {
    console.error('재고 항목 동기화 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 