import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    date: string;
  }>;
}

// 추가된 식재료 목록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId, date } = await context.params;
    const supabase = createServerSupabaseClient();

    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 추가된 식재료 목록 조회 (식재료 정보와 함께)
    const { data: additionalIngredients, error } = await supabase
      .from('cooking_plan_additional_ingredients')
      .select(`
        id,
        quantity,
        created_at,
        ingredient:ingredients (
          id,
          name,
          unit,
          price,
          package_amount,
          supplier,
          code_name
        )
      `)
      .eq('company_id', companyId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('추가된 식재료 조회 오류:', error);
      return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ additionalIngredients: additionalIngredients || [] });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 식재료 추가
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId, date } = await context.params;
    const { ingredientId, quantity } = await request.json();

    if (!ingredientId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: '유효하지 않은 데이터입니다.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 식재료가 해당 회사에 속하는지 확인
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id, name')
      .eq('id', ingredientId)
      .eq('company_id', companyId)
      .single();

    if (ingredientError || !ingredient) {
      return NextResponse.json({ error: '유효하지 않은 식재료입니다.' }, { status: 400 });
    }

    // 추가된 식재료 저장 (UPSERT)
    const { data, error } = await supabase
      .from('cooking_plan_additional_ingredients')
      .upsert({
        company_id: companyId,
        date,
        ingredient_id: ingredientId,
        quantity: parseFloat(quantity),
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        quantity,
        created_at,
        ingredient:ingredients (
          id,
          name,
          unit,
          price,
          package_amount,
          supplier,
          code_name
        )
      `)
      .single();

    if (error) {
      console.error('식재료 추가 오류:', error);
      return NextResponse.json({ error: '식재료 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ additionalIngredient: data });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 