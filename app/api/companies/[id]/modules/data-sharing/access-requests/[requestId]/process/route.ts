import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { processDataAccessRequest } from '@/lib/marketplace/data-sharing';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 데이터 액세스 요청을 처리하는 API (승인/거절)
 * POST /api/companies/:id/modules/data-sharing/access-requests/:requestId/process
 * body: {
 *   status: 'approved' | 'rejected'
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const { id: companyId, requestId } = params;
    
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 회사 접근 권한 확인 (관리자 또는 소유자만 데이터 액세스 요청 처리 가능)
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { error: '데이터 액세스 요청 처리 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 요청 데이터 확인
    const { status } = await request.json();
    
    // 데이터 검증
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      );
    }
    
    // 요청이 실제로 이 회사에 속하는지 확인
    const supabase = createServerSupabaseClient();
    const { data: accessRequest, error: checkError } = await supabase
      .from('module_data_access_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('company_id', companyId)
      .single();
    
    if (checkError || !accessRequest) {
      return NextResponse.json(
        { error: '해당 데이터 액세스 요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    if (accessRequest.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 요청입니다.' },
        { status: 400 }
      );
    }
    
    // 데이터 액세스 요청 처리
    const { success, error } = await processDataAccessRequest(
      requestId,
      status as 'approved' | 'rejected',
      userId
    );
    
    if (error || !success) {
      console.error('데이터 액세스 요청 처리 오류:', error);
      return NextResponse.json(
        { error: error ? error.toString() : '요청 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    const statusMessage = status === 'approved' ? 
      '데이터 액세스 요청이 승인되었습니다.' : 
      '데이터 액세스 요청이 거부되었습니다.';
    
    return NextResponse.json({ 
      success: true,
      message: statusMessage
    });
  } catch (error) {
    console.error('데이터 액세스 요청 처리 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 