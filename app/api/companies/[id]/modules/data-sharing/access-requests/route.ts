import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { createDataAccessRequest } from '@/lib/marketplace/data-sharing';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 모듈 간 데이터 액세스 요청을 생성하는 API
 * POST /api/companies/:id/modules/data-sharing/access-requests
 * body: {
 *   requesterModuleId: string,
 *   providerModuleId: string,
 *   dataSchemaId: string,
 *   accessLevel: 'read' | 'write' | 'read_write'
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
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 데이터 액세스 요청 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: '데이터 액세스 요청 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 요청 데이터 파싱
    const { 
      requesterModuleId, 
      providerModuleId, 
      dataSchemaId, 
      accessLevel 
    } = await request.json();
    
    // 데이터 검증
    if (!requesterModuleId || !providerModuleId || !dataSchemaId || !accessLevel) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    if (!['read', 'write', 'read_write'].includes(accessLevel)) {
      return NextResponse.json(
        { error: '유효하지 않은 액세스 레벨입니다.' },
        { status: 400 }
      );
    }
    
    // 데이터 액세스 요청 생성
    const { request: accessRequest, error } = await createDataAccessRequest(
      companyId,
      requesterModuleId,
      providerModuleId,
      dataSchemaId,
      accessLevel as 'read' | 'write' | 'read_write',
      userId
    );
    
    if (error) {
      console.error('데이터 액세스 요청 생성 오류:', error);
      return NextResponse.json(
        { error: error.toString() },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      accessRequest,
      message: '데이터 액세스 요청이 생성되었습니다.' 
    });
  } catch (error) {
    console.error('데이터 액세스 요청 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 모듈 간 데이터 액세스 요청 목록을 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/access-requests
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
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const moduleId = searchParams.get('moduleId');
    
    // 데이터 액세스 요청 목록 조회
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('module_data_access_requests')
      .select(`
        *,
        requester_module:requester_module_id (
          id,
          name
        ),
        provider_module:provider_module_id (
          id,
          name
        ),
        data_schema:data_schema_id (
          id,
          name
        )
      `)
      .eq('company_id', companyId);
    
    // 추가 필터 적용
    if (status) {
      query = query.eq('status', status);
    }
    
    if (moduleId) {
      query = query.or(`requester_module_id.eq.${moduleId},provider_module_id.eq.${moduleId}`);
    }
    
    // 최신 요청순으로 정렬
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('데이터 액세스 요청 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '데이터 액세스 요청 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ accessRequests: data || [] });
  } catch (error) {
    console.error('데이터 액세스 요청 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 