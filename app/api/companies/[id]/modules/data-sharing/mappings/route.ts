import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { getDataMappings } from '@/lib/marketplace/data-sharing';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 모듈 간 데이터 매핑 목록을 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/mappings?sourceModuleId=xxx&targetModuleId=xxx
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const sourceModuleId = searchParams.get('sourceModuleId');
    const targetModuleId = searchParams.get('targetModuleId');
    
    if (!sourceModuleId || !targetModuleId) {
      return NextResponse.json(
        { error: '소스 모듈 ID와 대상 모듈 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 데이터 매핑 목록 조회
    const { mappings, error } = await getDataMappings(
      companyId,
      sourceModuleId,
      targetModuleId
    );
    
    if (error) {
      console.error('데이터 매핑 조회 오류:', error);
      return NextResponse.json(
        { error: '데이터 매핑 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('데이터 매핑 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 모듈 간 데이터 매핑을 생성하는 API
 * POST /api/companies/:id/modules/data-sharing/mappings
 * body: {
 *   sourceModuleId: string,
 *   targetModuleId: string,
 *   sourceSchemaId: string,
 *   targetSchemaId: string,
 *   fieldMappings: Record<string, string>
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: companyId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 데이터 매핑 생성 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: '데이터 매핑 생성 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 요청 데이터 파싱
    const {
      sourceModuleId,
      targetModuleId,
      sourceSchemaId,
      targetSchemaId,
      fieldMappings
    } = await request.json();
    
    // 데이터 검증
    if (!sourceModuleId || !targetModuleId || !sourceSchemaId || !targetSchemaId || !fieldMappings) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    if (Object.keys(fieldMappings).length === 0) {
      return NextResponse.json(
        { error: '최소 하나 이상의 필드 매핑이 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 모듈 데이터 액세스 권한 확인
    const supabase = createServerSupabaseClient();
    
    const { data: accessData, error: accessError2 } = await supabase
      .from('module_data_access')
      .select('id')
      .eq('company_id', companyId)
      .eq('requester_module_id', targetModuleId)
      .eq('provider_module_id', sourceModuleId)
      .eq('data_schema_id', sourceSchemaId)
      .eq('is_active', true)
      .or('access_level.eq.read,access_level.eq.read_write')
      .maybeSingle();
    
    if (accessError2) {
      console.error('데이터 액세스 확인 오류:', accessError2);
      return NextResponse.json(
        { error: '데이터 액세스 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (!accessData) {
      return NextResponse.json(
        { error: '대상 모듈이 소스 모듈의 데이터에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 데이터 매핑 생성
    const { data, error } = await supabase
      .from('module_data_mappings')
      .insert({
        company_id: companyId,
        source_module_id: sourceModuleId,
        target_module_id: targetModuleId,
        source_schema_id: sourceSchemaId,
        target_schema_id: targetSchemaId,
        field_mappings: fieldMappings,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('데이터 매핑 생성 오류:', error);
      return NextResponse.json(
        { error: '데이터 매핑 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      mapping: data,
      message: '데이터 매핑이 생성되었습니다.'
    });
  } catch (error) {
    console.error('데이터 매핑 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 