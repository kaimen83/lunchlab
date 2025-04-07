import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCompanyMenuSettings, updateCompanyMenuSetting } from '@/lib/marketplace/queries';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 회사의 모듈 메뉴 설정 정보를 조회하는 API
 * GET /api/companies/[id]/modules/menu
 */
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인
    const supabase = createServerSupabaseClient();
    
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버십 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사 메뉴 설정 조회
    const { menuSettings, error } = await getCompanyMenuSettings(companyId);
    
    if (error) {
      console.error('회사 메뉴 설정 조회 오류:', error);
      return NextResponse.json({ error: '메뉴 설정 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ menuSettings });
  } catch (error) {
    console.error('메뉴 설정 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * 회사의 모듈 메뉴 설정을 업데이트하는 API
 * PUT /api/companies/[id]/modules/menu
 * 
 * 참고: 회사 관리자 이상만 접근 가능
 */
export async function PUT(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인 (관리자 이상만 메뉴 설정 변경 가능)
    const supabase = createServerSupabaseClient();
    
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 멤버십 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: '메뉴 설정 변경 권한이 없습니다. 관리자 또는 소유자만 메뉴 설정을 변경할 수 있습니다.' }, { status: 403 });
    }
    
    // 요청 바디 파싱
    let menuSettingData;
    try {
      menuSettingData = await req.json();
    } catch (e) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }
    
    const { menuItemId, isVisible, displayOrder } = menuSettingData;
    
    if (!menuItemId) {
      return NextResponse.json({ error: '메뉴 아이템 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: '표시 여부(isVisible)는 true 또는 false 값이어야 합니다.' }, { status: 400 });
    }
    
    // 메뉴 설정 업데이트
    const { menuSetting, error } = await updateCompanyMenuSetting(
      companyId,
      menuItemId,
      isVisible,
      displayOrder
    );
    
    if (error) {
      console.error('메뉴 설정 업데이트 오류:', error);
      return NextResponse.json({ error: '메뉴 설정 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      menuSetting
    });
  } catch (error) {
    console.error('메뉴 설정 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}