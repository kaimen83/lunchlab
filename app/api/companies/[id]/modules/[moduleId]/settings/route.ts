import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    moduleId: string;
  }>;
}

/**
 * 회사의 특정 모듈 설정 정보를 조회하는 API
 * GET /api/companies/[id]/modules/[moduleId]/settings
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
    const { id: companyId, moduleId } = await context.params;
    
    if (!companyId || !moduleId) {
      return NextResponse.json({ error: '회사 ID와 모듈 ID는 필수 항목입니다.' }, { status: 400 });
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
    
    // 모듈 구독 확인
    const { data: subscription, error: subscriptionError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .maybeSingle();
    
    if (subscriptionError) {
      console.error('모듈 구독 확인 오류:', subscriptionError);
      return NextResponse.json({ error: '모듈 구독 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!subscription) {
      return NextResponse.json({ error: '해당 회사는 이 모듈을 구독하지 않았습니다.' }, { status: 404 });
    }
    
    if (subscription.status !== 'active') {
      return NextResponse.json({ error: '이 모듈은 현재 활성화되지 않았습니다.' }, { status: 403 });
    }
    
    // 회사별 모듈 설정 조회
    const { data: settings, error: settingsError } = await supabase
      .from('company_module_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .maybeSingle();
    
    if (settingsError) {
      console.error('모듈 설정 조회 오류:', settingsError);
      return NextResponse.json({ error: '모듈 설정 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ settings: settings || {} });
  } catch (error) {
    console.error('모듈 설정 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * 회사의 특정 모듈 설정 정보를 업데이트하는 API
 * PUT /api/companies/[id]/modules/[moduleId]/settings
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
    const { id: companyId, moduleId } = await context.params;
    
    if (!companyId || !moduleId) {
      return NextResponse.json({ error: '회사 ID와 모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 회사 멤버십 확인 (관리자 이상만 설정 변경 가능)
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
      return NextResponse.json({ error: '모듈 설정 변경 권한이 없습니다. 관리자 또는 소유자만 설정을 변경할 수 있습니다.' }, { status: 403 });
    }
    
    // 모듈 구독 확인
    const { data: subscription, error: subscriptionError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .maybeSingle();
    
    if (subscriptionError) {
      console.error('모듈 구독 확인 오류:', subscriptionError);
      return NextResponse.json({ error: '모듈 구독 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!subscription) {
      return NextResponse.json({ error: '해당 회사는 이 모듈을 구독하지 않았습니다.' }, { status: 404 });
    }
    
    if (subscription.status !== 'active') {
      return NextResponse.json({ error: '이 모듈은 현재 활성화되지 않았습니다.' }, { status: 403 });
    }
    
    // 요청 바디 파싱
    let settingsData;
    try {
      settingsData = await req.json();
    } catch (e) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }
    
    if (!settingsData || typeof settingsData !== 'object') {
      return NextResponse.json({ error: '설정 데이터가 필요합니다.' }, { status: 400 });
    }
    
    // 설정 업데이트
    const { data: updatedSettings, error: updateError } = await supabase
      .from('company_module_settings')
      .upsert({
        company_id: companyId,
        module_id: moduleId,
        settings: settingsData,
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (updateError) {
      console.error('모듈 설정 업데이트 오류:', updateError);
      return NextResponse.json({ error: '모듈 설정 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      settings: updatedSettings[0]
    });
  } catch (error) {
    console.error('모듈 설정 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 