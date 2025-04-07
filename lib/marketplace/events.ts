import { createServerSupabaseClient } from '@/lib/supabase';
import { ModuleEvent } from '@/lib/types';
import { invalidateCache } from './data-sharing';

/**
 * 모듈 이벤트 생성 함수
 */
export async function createModuleEvent(
  companyId: string,
  sourceModuleId: string,
  eventType: string,
  dataId?: string,
  dataType?: string,
  eventData?: Record<string, any>
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_events')
      .insert({
        company_id: companyId,
        source_module_id: sourceModuleId,
        event_type: eventType,
        data_id: dataId,
        data_type: dataType,
        event_data: eventData,
        processed: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('이벤트 생성 오류:', error);
      return { event: null, error: error.message };
    }
    
    return { event: data };
  } catch (error) {
    console.error('이벤트 생성 중 오류 발생:', error);
    return { event: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 특정 모듈에 대한 미처리 이벤트 목록을 가져오는 함수
 */
export async function getUnprocessedEvents(companyId: string, moduleId?: string, limit: number = 50) {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('module_events')
      .select('*')
      .eq('company_id', companyId)
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (moduleId) {
      query = query.neq('source_module_id', moduleId); // 자기 자신이 발행한 이벤트는 제외
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('미처리 이벤트 조회 오류:', error);
      return { events: [], error: error.message };
    }
    
    return { events: data || [] };
  } catch (error) {
    console.error('미처리 이벤트 조회 중 오류 발생:', error);
    return { events: [], error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 특정 이벤트 타입에 구독 중인 모듈 목록을 가져오는 함수
 */
export async function getModuleEventSubscriptions(companyId: string, eventType: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_event_subscriptions')
      .select(`
        *,
        module_id (
          id,
          name
        )
      `)
      .eq('company_id', companyId)
      .eq('event_type', eventType)
      .eq('is_active', true);
    
    if (error) {
      console.error('이벤트 구독 정보 조회 오류:', error);
      return { subscriptions: [], error: error.message };
    }
    
    return { subscriptions: data || [] };
  } catch (error) {
    console.error('이벤트 구독 정보 조회 중 오류 발생:', error);
    return { subscriptions: [], error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 이벤트 구독 정보 생성 함수
 */
export async function subscribeToEvent(
  companyId: string,
  moduleId: string,
  eventType: string,
  callbackUrl?: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 기존 구독 확인
    const { data: existingSubscription, error: checkError } = await supabase
      .from('module_event_subscriptions')
      .select('id, is_active')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('event_type', eventType)
      .maybeSingle();
    
    if (checkError) {
      console.error('이벤트 구독 확인 오류:', checkError);
      return { subscription: null, error: checkError.message };
    }
    
    let result;
    
    if (existingSubscription) {
      // 기존 구독이 비활성화된 경우 활성화로 업데이트
      if (!existingSubscription.is_active) {
        const { data, error: updateError } = await supabase
          .from('module_event_subscriptions')
          .update({
            is_active: true,
            callback_url: callbackUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('이벤트 구독 업데이트 오류:', updateError);
          return { subscription: null, error: updateError.message };
        }
        
        result = data;
      } else {
        return { subscription: existingSubscription, error: '이미 구독 중인 이벤트입니다.' };
      }
    } else {
      // 새 구독 생성
      const { data, error } = await supabase
        .from('module_event_subscriptions')
        .insert({
          company_id: companyId,
          module_id: moduleId,
          event_type: eventType,
          callback_url: callbackUrl,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('이벤트 구독 생성 오류:', error);
        return { subscription: null, error: error.message };
      }
      
      result = data;
    }
    
    return { subscription: result };
  } catch (error) {
    console.error('이벤트 구독 중 오류 발생:', error);
    return { subscription: null, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 이벤트 구독 취소 함수
 */
export async function unsubscribeFromEvent(
  companyId: string,
  moduleId: string,
  eventType: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('module_event_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('event_type', eventType);
    
    if (error) {
      console.error('이벤트 구독 취소 오류:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('이벤트 구독 취소 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 이벤트 처리 완료 표시 함수
 */
export async function markEventAsProcessed(eventId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('module_events')
      .update({
        processed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId);
    
    if (error) {
      console.error('이벤트 처리 완료 표시 오류:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('이벤트 처리 완료 표시 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 캐시 정책에 따라 캐시 무효화가 필요한지 확인하고 처리하는 함수
 */
export async function handleCacheInvalidationForEvent(
  companyId: string,
  event: ModuleEvent
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 해당 이벤트에 영향을 받는 캐싱 정책 조회
    const { data: cachePolicies, error } = await supabase
      .from('module_caching_policies')
      .select('module_id, data_schema_id')
      .or(`strategy.eq.event_based,strategy.eq.hybrid`)
      .containedBy('invalidate_on_events', [event.event_type]);
    
    if (error) {
      console.error('캐싱 정책 조회 오류:', error);
      return { success: false, error: error.message };
    }
    
    if (!cachePolicies || cachePolicies.length === 0) {
      return { success: true, invalidatedCount: 0 };
    }
    
    // 각 캐싱 정책에 따라 캐시 무효화 실행
    let invalidatedCount = 0;
    for (const policy of cachePolicies) {
      const { success } = await invalidateCache(
        companyId,
        policy.module_id,
        policy.data_schema_id
      );
      
      if (success) {
        invalidatedCount++;
      }
    }
    
    return { success: true, invalidatedCount };
  } catch (error) {
    console.error('캐시 무효화 처리 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 이벤트 발행 및 관련 캐시 무효화를 통합적으로 처리하는 함수
 */
export async function publishEvent(
  companyId: string,
  sourceModuleId: string,
  eventType: string,
  dataId?: string,
  dataType?: string,
  eventData?: Record<string, any>,
  invalidateDataSchemaId?: string
) {
  try {
    // 이벤트 생성
    const { event, error } = await createModuleEvent(
      companyId,
      sourceModuleId,
      eventType,
      dataId,
      dataType,
      eventData
    );
    
    if (error || !event) {
      return { success: false, error: error || '이벤트 생성 실패' };
    }
    
    // 특정 데이터 스키마에 대한 캐시 무효화가 요청된 경우
    if (invalidateDataSchemaId) {
      await invalidateCache(companyId, sourceModuleId, invalidateDataSchemaId);
    }
    
    // 이벤트 기반 캐시 무효화 정책 처리
    await handleCacheInvalidationForEvent(companyId, event);
    
    return { success: true, event };
  } catch (error) {
    console.error('이벤트 발행 중 오류 발생:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
} 