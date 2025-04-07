import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { 
  getSharedDataFromCache, 
  saveSharedDataToCache, 
  invalidateCache,
  checkModuleDataAccess
} from '@/lib/marketplace/data-sharing';

/**
 * 공유 데이터 캐시에서 데이터를 조회하는 API
 * GET /api/companies/:id/modules/data-sharing/cache?moduleId=xxx&dataSchemaId=xxx&cacheKey=xxx
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
    const moduleId = searchParams.get('moduleId');
    const dataSchemaId = searchParams.get('dataSchemaId');
    const cacheKey = searchParams.get('cacheKey');
    const requesterModuleId = searchParams.get('requesterModuleId');
    
    if (!moduleId || !dataSchemaId || !cacheKey) {
      return NextResponse.json(
        { error: '필수 쿼리 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 데이터 접근 권한 확인 (요청자 모듈이 제공된 경우)
    if (requesterModuleId && requesterModuleId !== moduleId) {
      const { hasAccess, error: accessCheckError } = await checkModuleDataAccess(
        companyId,
        requesterModuleId,
        moduleId,
        dataSchemaId,
        'read'
      );
      
      if (accessCheckError) {
        console.error('데이터 접근 권한 확인 오류:', accessCheckError);
        return NextResponse.json(
          { error: '데이터 접근 권한 확인 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: '해당 데이터에 대한 접근 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }
    
    // 캐시에서 데이터 조회
    const { cacheItem, error, expired } = await getSharedDataFromCache(
      companyId,
      moduleId,
      dataSchemaId,
      cacheKey
    );
    
    if (error) {
      console.error('캐시 데이터 조회 오류:', error);
      return NextResponse.json(
        { error: '캐시 데이터 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (!cacheItem) {
      return NextResponse.json(
        { error: '캐시 데이터를 찾을 수 없습니다.', expired: !!expired },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      data: cacheItem.data,
      meta: {
        createdAt: cacheItem.created_at,
        updatedAt: cacheItem.updated_at,
        expiresAt: cacheItem.expires_at
      }
    });
  } catch (error) {
    console.error('캐시 데이터 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 공유 데이터 캐시에 데이터를 저장하는 API
 * POST /api/companies/:id/modules/data-sharing/cache
 * body: {
 *   moduleId: string,
 *   dataSchemaId: string,
 *   dataId: string,
 *   cacheKey: string,
 *   data: object,
 *   ttlSeconds?: number
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
    
    // 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json({ error: '해당 회사에 접근할 수 없습니다.' }, { status: 403 });
    }
    
    // 요청 데이터 파싱
    const {
      moduleId,
      dataSchemaId,
      dataId,
      cacheKey,
      data,
      ttlSeconds
    } = await request.json();
    
    // 데이터 검증
    if (!moduleId || !dataSchemaId || !dataId || !cacheKey || !data) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 캐시에 데이터 저장
    const { success, cacheItem, error } = await saveSharedDataToCache(
      companyId,
      moduleId,
      dataSchemaId,
      dataId,
      cacheKey,
      data,
      ttlSeconds
    );
    
    if (error || !success) {
      console.error('캐시 데이터 저장 오류:', error);
      return NextResponse.json(
        { error: '캐시 데이터 저장 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      cacheItem: {
        id: cacheItem?.id,
        createdAt: cacheItem?.created_at,
        updatedAt: cacheItem?.updated_at,
        expiresAt: cacheItem?.expires_at
      },
      message: '데이터가 캐시에 저장되었습니다.'
    });
  } catch (error) {
    console.error('캐시 데이터 저장 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 공유 데이터 캐시를 무효화하는 API
 * DELETE /api/companies/:id/modules/data-sharing/cache?moduleId=xxx&dataSchemaId=xxx&cacheKey=xxx
 */
export async function DELETE(
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
    const moduleId = searchParams.get('moduleId');
    const dataSchemaId = searchParams.get('dataSchemaId');
    const cacheKey = searchParams.get('cacheKey');
    
    if (!moduleId) {
      return NextResponse.json(
        { error: '모듈 ID는 필수입니다.' },
        { status: 400 }
      );
    }
    
    // 캐시 무효화
    const { success, error } = await invalidateCache(
      companyId,
      moduleId,
      dataSchemaId || '',
      cacheKey || undefined
    );
    
    if (error || !success) {
      console.error('캐시 무효화 오류:', error);
      return NextResponse.json(
        { error: '캐시 무효화 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: '캐시가 무효화되었습니다.'
    });
  } catch (error) {
    console.error('캐시 무효화 중 오류 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 