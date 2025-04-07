import { ModuleEvent, ModuleEventSubscription } from '@/lib/types';

/**
 * 이벤트 발행 함수 (클라이언트 측)
 */
export async function publishEventClient(
  companyId: string,
  moduleId: string,
  eventType: string,
  dataId?: string,
  dataType?: string,
  eventData?: Record<string, any>,
  invalidateDataSchemaId?: string
) {
  try {
    const response = await fetch(`/api/companies/${companyId}/modules/data-sharing/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleId,
        eventType,
        dataId,
        dataType,
        eventData,
        invalidateDataSchemaId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이벤트 발행 중 오류가 발생했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('이벤트 발행 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 미처리 이벤트 목록 조회 함수 (클라이언트 측)
 */
export async function fetchUnprocessedEventsClient(
  companyId: string,
  moduleId?: string,
  limit?: number
) {
  try {
    let url = `/api/companies/${companyId}/modules/data-sharing/events`;
    const params = new URLSearchParams();
    
    if (moduleId) {
      params.append('moduleId', moduleId);
    }
    
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이벤트 조회 중 오류가 발생했습니다.');
    }
    
    const data = await response.json();
    return data.events as ModuleEvent[];
  } catch (error) {
    console.error('이벤트 조회 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 이벤트 처리 완료 표시 함수 (클라이언트 측)
 */
export async function markEventAsProcessedClient(
  companyId: string,
  eventId: string,
  moduleId: string
) {
  try {
    const response = await fetch(
      `/api/companies/${companyId}/modules/data-sharing/events/${eventId}/process`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이벤트 처리 완료 표시 중 오류가 발생했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('이벤트 처리 완료 표시 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 이벤트 구독 목록 조회 함수 (클라이언트 측)
 */
export async function fetchEventSubscriptionsClient(
  companyId: string,
  moduleId?: string,
  eventType?: string
) {
  try {
    let url = `/api/companies/${companyId}/modules/data-sharing/subscriptions`;
    const params = new URLSearchParams();
    
    if (moduleId) {
      params.append('moduleId', moduleId);
    }
    
    if (eventType) {
      params.append('eventType', eventType);
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '구독 정보 조회 중 오류가 발생했습니다.');
    }
    
    const data = await response.json();
    return data.subscriptions as ModuleEventSubscription[];
  } catch (error) {
    console.error('구독 정보 조회 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 이벤트 구독 생성 함수 (클라이언트 측)
 */
export async function subscribeToEventClient(
  companyId: string,
  moduleId: string,
  eventType: string,
  callbackUrl?: string
) {
  try {
    const response = await fetch(`/api/companies/${companyId}/modules/data-sharing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleId,
        eventType,
        callbackUrl
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이벤트 구독 중 오류가 발생했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('이벤트 구독 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 이벤트 구독 취소 함수 (클라이언트 측)
 */
export async function unsubscribeFromEventClient(
  companyId: string,
  moduleId: string,
  eventType: string
) {
  try {
    let url = `/api/companies/${companyId}/modules/data-sharing/subscriptions`;
    const params = new URLSearchParams();
    
    params.append('moduleId', moduleId);
    params.append('eventType', eventType);
    
    url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '이벤트 구독 취소 중 오류가 발생했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('이벤트 구독 취소 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 이벤트 폴링 함수 (클라이언트 측)
 * 주기적으로 이벤트를 폴링하고 처리하는 유틸리티 함수
 */
export function setupEventPolling(
  companyId: string,
  moduleId: string,
  eventHandler: (event: ModuleEvent) => Promise<boolean>,
  pollingIntervalMs: number = 10000
) {
  let intervalId: NodeJS.Timeout | null = null;
  
  const startPolling = () => {
    if (intervalId) return; // 이미 실행 중인 경우
    
    const pollEvents = async () => {
      try {
        // 미처리 이벤트 조회
        const events = await fetchUnprocessedEventsClient(companyId, moduleId);
        
        if (events.length > 0) {
          console.log(`${events.length}개의 미처리 이벤트를 발견했습니다.`);
          
          // 각 이벤트 처리
          for (const event of events) {
            try {
              // 이벤트 핸들러 호출
              const success = await eventHandler(event);
              
              if (success) {
                // 이벤트 처리 완료 표시
                await markEventAsProcessedClient(companyId, event.id, moduleId);
              }
            } catch (error) {
              console.error(`이벤트(${event.id}) 처리 중 오류 발생:`, error);
            }
          }
        }
      } catch (error) {
        console.error('이벤트 폴링 중 오류 발생:', error);
      }
    };
    
    // 첫 실행
    pollEvents();
    
    // 주기적 폴링 설정
    intervalId = setInterval(pollEvents, pollingIntervalMs);
  };
  
  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
  
  return {
    startPolling,
    stopPolling
  };
} 