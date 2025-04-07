import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  ModuleDataSchema, 
  ModuleDataAccessRequest,
  ModuleDataAccess,
  SharedDataCacheItem,
  ModuleCachingPolicy,
  ModuleDataMapping,
  DataSyncLog,
} from '@/lib/types';

/**
 * 모듈의 데이터 스키마 목록을 가져오는 함수
 */
export async function getModuleDataSchemas(moduleId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_data_schemas')
      .select('*')
      .eq('module_id', moduleId)
      .order('name');
    
    if (error) {
      console.error('모듈 데이터 스키마 조회 오류:', error);
      return { schemas: [], error: error.message };
    }
    
    return { schemas: data || [] };
  } catch (error) {
    console.error('모듈 데이터 스키마 조회 중 오류 발생:', error);
    return { schemas: [], error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 특정 데이터 스키마 정보를 가져오는 함수
 */
export async function getDataSchema(schemaId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_data_schemas')
      .select('*')
      .eq('id', schemaId)
      .single();
    
    if (error) {
      console.error('데이터 스키마 조회 오류:', error);
      return { schema: null, error: error.message };
    }
    
    return { schema: data };
  } catch (error) {
    console.error('데이터 스키마 조회 중 오류 발생:', error);
    return { schema: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 회사 내에서 공유 가능한 모든 데이터 스키마 목록을 가져오는 함수
 */
export async function getSharedDataSchemas(companyId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 공유 가능한 스키마만 필터링
    const { data, error } = await supabase
      .from('module_data_schemas')
      .select(`
        *,
        marketplace_modules (
          id,
          name
        )
      `)
      .eq('is_shared', true)
      .order('name');
    
    if (error) {
      console.error('공유 데이터 스키마 조회 오류:', error);
      return { schemas: [], error: error.message };
    }
    
    // 회사가 구독 중인 모듈의 스키마만 필터링
    const { data: companyModules, error: modulesError } = await supabase
      .from('company_modules')
      .select('module_id')
      .eq('company_id', companyId)
      .eq('status', 'active');
    
    if (modulesError) {
      console.error('회사 모듈 조회 오류:', modulesError);
      return { schemas: [], error: modulesError.message };
    }
    
    const activeModuleIds = companyModules.map(item => item.module_id);
    
    // 구독 중인 모듈의 스키마만 필터링
    const filteredSchemas = data.filter(schema => 
      activeModuleIds.includes(schema.module_id)
    );
    
    return { schemas: filteredSchemas || [] };
  } catch (error) {
    console.error('공유 데이터 스키마 조회 중 오류 발생:', error);
    return { schemas: [], error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 데이터 액세스 요청을 생성하는 함수
 */
export async function createDataAccessRequest(
  companyId: string,
  requesterModuleId: string,
  providerModuleId: string,
  dataSchemaId: string,
  accessLevel: 'read' | 'write' | 'read_write',
  requestedBy: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 이미 존재하는 요청 확인
    const { data: existingRequest, error: checkError } = await supabase
      .from('module_data_access_requests')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('requester_module_id', requesterModuleId)
      .eq('provider_module_id', providerModuleId)
      .eq('data_schema_id', dataSchemaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (checkError) {
      console.error('데이터 액세스 요청 확인 오류:', checkError);
      return { request: null, error: checkError.message };
    }
    
    // 이미 대기 중인 요청이 있으면 중복 생성하지 않음
    if (existingRequest && existingRequest.status === 'pending') {
      return { request: existingRequest, error: '이미 대기 중인 액세스 요청이 있습니다.' };
    }
    
    // 새 요청 생성
    const { data, error } = await supabase
      .from('module_data_access_requests')
      .insert({
        company_id: companyId,
        requester_module_id: requesterModuleId,
        provider_module_id: providerModuleId,
        data_schema_id: dataSchemaId,
        access_level: accessLevel,
        status: 'pending',
        requested_by: requestedBy
      })
      .select()
      .single();
    
    if (error) {
      console.error('데이터 액세스 요청 생성 오류:', error);
      return { request: null, error: error.message };
    }
    
    return { request: data };
  } catch (error) {
    console.error('데이터 액세스 요청 생성 중 오류 발생:', error);
    return { request: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 데이터 액세스 요청을 처리하는 함수 (승인/거절)
 */
export async function processDataAccessRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 요청 상태 업데이트
    const { data, error } = await supabase
      .from('module_data_access_requests')
      .update({
        status,
        reviewed_by: reviewedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();
    
    if (error) {
      console.error('데이터 액세스 요청 처리 오류:', error);
      return { success: false, error: error.message };
    }
    
    // 승인된 경우 액세스 권한 생성
    if (status === 'approved') {
      const accessToken = generateAccessToken();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 기본 1년 유효기간
      
      const { error: accessError } = await supabase
        .from('module_data_access')
        .insert({
          company_id: data.company_id,
          requester_module_id: data.requester_module_id,
          provider_module_id: data.provider_module_id,
          data_schema_id: data.data_schema_id,
          access_level: data.access_level,
          access_token: accessToken,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
      
      if (accessError) {
        console.error('데이터 액세스 권한 생성 오류:', accessError);
        return { success: false, error: accessError.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('데이터 액세스 요청 처리 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 모듈 간 데이터 접근 권한을 확인하는 함수
 */
export async function checkModuleDataAccess(
  companyId: string,
  requesterModuleId: string,
  providerModuleId: string,
  dataSchemaId: string,
  accessLevel: 'read' | 'write' | 'read_write'
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 필요한 액세스 레벨에 따라 쿼리 조건 구성
    let accessCondition;
    if (accessLevel === 'read') {
      accessCondition = 'access_level.eq.read,access_level.eq.read_write';
    } else if (accessLevel === 'write') {
      accessCondition = 'access_level.eq.write,access_level.eq.read_write';
    } else {
      accessCondition = 'access_level.eq.read_write';
    }
    
    const { data, error } = await supabase
      .from('module_data_access')
      .select('*')
      .eq('company_id', companyId)
      .eq('requester_module_id', requesterModuleId)
      .eq('provider_module_id', providerModuleId)
      .eq('data_schema_id', dataSchemaId)
      .eq('is_active', true)
      .or(accessCondition)
      .lt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error) {
      console.error('데이터 액세스 확인 오류:', error);
      return { hasAccess: false, error: error.message };
    }
    
    return { hasAccess: !!data, accessData: data };
  } catch (error) {
    console.error('데이터 액세스 확인 중 오류 발생:', error);
    return { hasAccess: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 공유 데이터 캐시에서 데이터를 가져오는 함수
 */
export async function getSharedDataFromCache(
  companyId: string,
  moduleId: string,
  dataSchemaId: string,
  cacheKey: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('shared_data_cache')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('data_schema_id', dataSchemaId)
      .eq('cache_key', cacheKey)
      .maybeSingle();
    
    if (error) {
      console.error('캐시 데이터 조회 오류:', error);
      return { cacheItem: null, error: error.message };
    }
    
    if (!data) {
      return { cacheItem: null };
    }
    
    // 만료 시간 확인
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { cacheItem: null, expired: true };
    }
    
    return { cacheItem: data };
  } catch (error) {
    console.error('캐시 데이터 조회 중 오류 발생:', error);
    return { cacheItem: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 공유 데이터 캐시에 데이터를 저장하는 함수
 */
export async function saveSharedDataToCache(
  companyId: string,
  moduleId: string,
  dataSchemaId: string,
  dataId: string,
  cacheKey: string,
  data: Record<string, any>,
  ttlSeconds?: number
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // TTL 계산
    let expiresAt = null;
    if (ttlSeconds) {
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
    }
    
    // 기존 캐시 항목이 있는지 확인
    const { data: existingItem, error: checkError } = await supabase
      .from('shared_data_cache')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('data_schema_id', dataSchemaId)
      .eq('cache_key', cacheKey)
      .maybeSingle();
    
    if (checkError) {
      console.error('캐시 데이터 확인 오류:', checkError);
      return { success: false, error: checkError.message };
    }
    
    let result;
    
    if (existingItem) {
      // 기존 항목 업데이트
      const { data: updatedItem, error: updateError } = await supabase
        .from('shared_data_cache')
        .update({
          data,
          updated_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString()
        })
        .eq('id', existingItem.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('캐시 데이터 업데이트 오류:', updateError);
        return { success: false, error: updateError.message };
      }
      
      result = updatedItem;
    } else {
      // 새 항목 생성
      const { data: newItem, error: insertError } = await supabase
        .from('shared_data_cache')
        .insert({
          company_id: companyId,
          module_id: moduleId,
          data_schema_id: dataSchemaId,
          data_id: dataId,
          cache_key: cacheKey,
          data,
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('캐시 데이터 생성 오류:', insertError);
        return { success: false, error: insertError.message };
      }
      
      result = newItem;
    }
    
    return { success: true, cacheItem: result };
  } catch (error) {
    console.error('캐시 데이터 저장 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 공유 데이터 캐시 항목을 제거하는 함수
 */
export async function invalidateCache(
  companyId: string,
  moduleId: string,
  dataSchemaId: string,
  cacheKey?: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('shared_data_cache')
      .delete()
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    if (dataSchemaId) {
      query = query.eq('data_schema_id', dataSchemaId);
    }
    
    if (cacheKey) {
      query = query.eq('cache_key', cacheKey);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('캐시 무효화 오류:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('캐시 무효화 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 캐시 정책 정보를 가져오는 함수
 */
export async function getCachingPolicy(moduleId: string, dataSchemaId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_caching_policies')
      .select('*')
      .eq('module_id', moduleId)
      .eq('data_schema_id', dataSchemaId)
      .maybeSingle();
    
    if (error) {
      console.error('캐시 정책 조회 오류:', error);
      return { policy: null, error: error.message };
    }
    
    return { policy: data };
  } catch (error) {
    console.error('캐시 정책 조회 중 오류 발생:', error);
    return { policy: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 모듈 간 데이터 매핑 설정을 가져오는 함수
 */
export async function getDataMappings(
  companyId: string,
  sourceModuleId: string,
  targetModuleId: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_data_mappings')
      .select('*')
      .eq('company_id', companyId)
      .eq('source_module_id', sourceModuleId)
      .eq('target_module_id', targetModuleId)
      .eq('is_active', true);
    
    if (error) {
      console.error('데이터 매핑 조회 오류:', error);
      return { mappings: [], error: error.message };
    }
    
    return { mappings: data || [] };
  } catch (error) {
    console.error('데이터 매핑 조회 중 오류 발생:', error);
    return { mappings: [], error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 모듈 간 데이터 동기화 로그를 생성하는 함수
 */
export async function createSyncLog(
  companyId: string,
  sourceModuleId: string,
  targetModuleId: string,
  mappingId: string,
  status: 'success' | 'failed' | 'partial',
  itemsProcessed: number,
  itemsSynced: number,
  errorMessage?: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('data_sync_logs')
      .insert({
        company_id: companyId,
        source_module_id: sourceModuleId,
        target_module_id: targetModuleId,
        mapping_id: mappingId,
        status,
        items_processed: itemsProcessed,
        items_synced: itemsSynced,
        error_message: errorMessage
      })
      .select()
      .single();
    
    if (error) {
      console.error('동기화 로그 생성 오류:', error);
      return { log: null, error: error.message };
    }
    
    return { log: data };
  } catch (error) {
    console.error('동기화 로그 생성 중 오류 발생:', error);
    return { log: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 액세스 토큰 생성 헬퍼 함수
 */
function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
} 