import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

// 발주량 데이터 타입
interface OrderQuantity {
  ingredient_id: string;
  order_quantity: number;
}

// 발주량 저장 요청 스키마
const saveOrderQuantitiesSchema = z.object({
  order_quantities: z.array(z.object({
    ingredient_id: z.string().uuid('유효한 식재료 ID가 아닙니다.'),
    order_quantity: z.number().min(0, '발주량은 0 이상이어야 합니다.')
  }))
});

// GET: 특정 날짜의 발주량 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId, date } = await params;

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD).' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 회사 권한 확인
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (companyUserError || !companyUser) {
      return NextResponse.json(
        { error: '해당 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 발주량 조회
    const { data: orderQuantities, error: orderQuantitiesError } = await supabase
      .from('order_quantities')
      .select('ingredient_id, order_quantity')
      .eq('company_id', companyId)
      .eq('date', date);

    if (orderQuantitiesError) {
      console.error('발주량 조회 오류:', orderQuantitiesError);
      return NextResponse.json(
        { error: '발주량을 조회하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order_quantities: orderQuantities || [] });

  } catch (error) {
    console.error('발주량 조회 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 발주량 저장/업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId, date } = await params;

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: '유효한 날짜 형식이 아닙니다 (YYYY-MM-DD).' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = saveOrderQuantitiesSchema.parse(body);

    const supabase = await createServerSupabaseClient();

    // 회사 권한 확인
    const { data: companyUser, error: companyUserError } = await supabase
      .from('company_memberships')
      .select('company_id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (companyUserError || !companyUser) {
      return NextResponse.json(
        { error: '해당 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 발주량 저장/업데이트 (upsert 사용)
    const orderQuantitiesToSave = validatedData.order_quantities.map(item => ({
      company_id: companyId,
      date: date,
      ingredient_id: item.ingredient_id,
      order_quantity: item.order_quantity
    }));

    const { error: upsertError } = await supabase
      .from('order_quantities')
      .upsert(orderQuantitiesToSave, { 
        onConflict: 'company_id,date,ingredient_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('발주량 저장 오류:', upsertError);
      return NextResponse.json(
        { error: '발주량을 저장하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: '발주량이 성공적으로 저장되었습니다.',
      saved_count: orderQuantitiesToSave.length
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '요청 데이터 형식이 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      );
    }

    console.error('발주량 저장 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 