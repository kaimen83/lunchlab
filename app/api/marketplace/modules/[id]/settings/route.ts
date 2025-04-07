import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 특정 마켓플레이스 모듈의 설정 정보를 조회하는 API
 * GET /api/marketplace/modules/[id]/settings
 * 
 * 참고: 관리자만 접근 가능
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
    const { id: moduleId } = await context.params;
    
    if (!moduleId) {
      return NextResponse.json({ error: '모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 관리자 권한 확인
    const supabase = createServerSupabaseClient();
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (adminError) {
      console.error('관리자 확인 오류:', adminError);
      return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: '이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다.' }, { status: 403 });
    }
    
    // 모듈 설정 정보 조회
    const { data: settings, error: settingsError } = await supabase
      .from('marketplace_module_settings')
      .select('*')
      .eq('module_id', moduleId);
    
    if (settingsError) {
      console.error('모듈 설정 조회 오류:', settingsError);
      return NextResponse.json({ error: '모듈 설정 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('모듈 설정 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * 특정 마켓플레이스 모듈의 설정 정보를 업데이트하는 API
 * PUT /api/marketplace/modules/[id]/settings
 * 
 * 참고: 관리자만 접근 가능
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
    const { id: moduleId } = await context.params;
    
    if (!moduleId) {
      return NextResponse.json({ error: '모듈 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 관리자 권한 확인
    const supabase = createServerSupabaseClient();
    const { data: adminCheck, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (adminError) {
      console.error('관리자 확인 오류:', adminError);
      return NextResponse.json({ error: '권한 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: '이 API에 접근할 권한이 없습니다. 관리자만 접근 가능합니다.' }, { status: 403 });
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
      .from('marketplace_module_settings')
      .upsert({
        module_id: moduleId,
        ...settingsData,
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