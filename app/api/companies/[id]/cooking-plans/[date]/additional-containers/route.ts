import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    date: string;
  }>;
}

// 추가된 용기 목록 조회
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

    // 추가된 용기 목록 조회 (용기 정보와 함께)
    const { data: additionalContainers, error } = await supabase
      .from('cooking_plan_additional_containers')
      .select(`
        id,
        quantity,
        created_at,
        container:containers (
          id,
          name,
          price,
          code_name,
          description
        )
      `)
      .eq('company_id', companyId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('추가된 용기 조회 오류:', error);
      return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ additionalContainers: additionalContainers || [] });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 용기 추가
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId, date } = await context.params;
    const { containerId, quantity } = await request.json();

    if (!containerId || !quantity || quantity <= 0) {
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

    // 용기가 해당 회사에 속하는지 확인
    const { data: container, error: containerError } = await supabase
      .from('containers')
      .select('id, name')
      .eq('id', containerId)
      .eq('company_id', companyId)
      .single();

    if (containerError || !container) {
      return NextResponse.json({ error: '유효하지 않은 용기입니다.' }, { status: 400 });
    }

    // 추가된 용기 저장 (UPSERT)
    const { data, error } = await supabase
      .from('cooking_plan_additional_containers')
      .upsert({
        company_id: companyId,
        date,
        container_id: containerId,
        quantity: parseFloat(quantity),
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        quantity,
        created_at,
        container:containers (
          id,
          name,
          price,
          code_name,
          description
        )
      `)
      .single();

    if (error) {
      console.error('용기 추가 오류:', error);
      return NextResponse.json({ error: '용기 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ additionalContainer: data });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 