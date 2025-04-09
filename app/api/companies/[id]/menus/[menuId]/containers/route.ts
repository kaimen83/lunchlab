import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

// 메뉴의 용기 목록 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 메뉴와 회사 정보 확인
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .eq('company_id', companyId)
      .single();
    
    if (menuError) {
      console.error('메뉴 조회 오류:', menuError);
      return NextResponse.json({ error: '메뉴를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 메뉴-용기 관계 조회
    const { data: menuContainers, error: menuContainersError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        menu_id,
        ingredient_amount_factor,
        cost_price,
        container:container_sizes (id, name, description)
      `)
      .eq('menu_id', menuId)
      .order('id', { ascending: true });
    
    if (menuContainersError) {
      console.error('메뉴-용기 관계 조회 오류:', menuContainersError);
      return NextResponse.json({ error: '메뉴-용기 관계 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(menuContainers || []);
  } catch (error) {
    console.error('메뉴-용기 관계 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 메뉴-용기 관계 추가/수정
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다. 배열 형태로 요청해주세요.' }, { status: 400 });
    }
    
    // 필수 입력값 검증
    for (const item of body) {
      if (!item.container_size_id) {
        return NextResponse.json({ error: '모든 항목에 용기 사이즈 ID가 필요합니다.' }, { status: 400 });
      }
      
      if (!item.ingredient_amount_factor || item.ingredient_amount_factor <= 0) {
        return NextResponse.json({ error: '모든 항목에 식재료 양 비율(양수)이 필요합니다.' }, { status: 400 });
      }
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 메뉴와 회사 정보 확인
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', menuId)
      .eq('company_id', companyId)
      .single();
    
    if (menuError) {
      console.error('메뉴 조회 오류:', menuError);
      return NextResponse.json({ error: '메뉴를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 선택된 용기 사이즈들이 해당 회사의 것인지 확인
    const containerSizeIds = body.map(item => item.container_size_id);
    const { data: containerSizes, error: containerSizesError } = await supabase
      .from('container_sizes')
      .select('id')
      .eq('company_id', companyId)
      .in('id', containerSizeIds);
    
    if (containerSizesError) {
      console.error('용기 사이즈 확인 오류:', containerSizesError);
      return NextResponse.json({ error: '용기 사이즈 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!containerSizes || containerSizes.length !== containerSizeIds.length) {
      return NextResponse.json({ error: '일부 용기 사이즈가 존재하지 않거나 해당 회사의 것이 아닙니다.' }, { status: 400 });
    }
    
    // 트랜잭션 시작
    // 1. 기존 메뉴-용기 관계 삭제
    const { error: deleteError } = await supabase
      .from('menu_containers')
      .delete()
      .eq('menu_id', menuId);
    
    if (deleteError) {
      console.error('기존 메뉴-용기 관계 삭제 오류:', deleteError);
      return NextResponse.json({ error: '메뉴-용기 관계 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 2. 새로운 메뉴-용기 관계 추가
    const menuContainers = body.map(item => ({
      menu_id: menuId,
      container_size_id: item.container_size_id,
      ingredient_amount_factor: item.ingredient_amount_factor,
      cost_price: menu.cost_price * item.ingredient_amount_factor // 기본 원가에 비율을 곱해 계산
    }));
    
    const { data: insertedData, error: insertError } = await supabase
      .from('menu_containers')
      .insert(menuContainers)
      .select();
    
    if (insertError) {
      console.error('메뉴-용기 관계 추가 오류:', insertError);
      return NextResponse.json({ error: '메뉴-용기 관계 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 3. 추가된 메뉴-용기 관계 조회
    const { data: updatedMenuContainers, error: updatedError } = await supabase
      .from('menu_containers')
      .select(`
        id,
        menu_id,
        ingredient_amount_factor,
        cost_price,
        container:container_sizes (id, name, description)
      `)
      .eq('menu_id', menuId)
      .order('id', { ascending: true });
    
    if (updatedError) {
      console.error('업데이트된 메뉴-용기 관계 조회 오류:', updatedError);
      return NextResponse.json({ error: '메뉴-용기 관계 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(updatedMenuContainers || []);
  } catch (error) {
    console.error('메뉴-용기 관계 추가/수정 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 