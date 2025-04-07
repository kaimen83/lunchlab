import { createClient } from '@/lib/supabase';
import { ModuleLifecycle } from './module-template';

/**
 * 회사에 모듈을 설치합니다.
 * 
 * @param companyId 대상 회사 ID
 * @param moduleId 설치할 모듈 ID
 * @param lifecycleHandlers 모듈 라이프사이클 핸들러 (선택사항)
 */
export async function installModule(
  companyId: string,
  moduleId: string,
  lifecycleHandlers?: ModuleLifecycle
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 이미 구독 중인지 확인
    const { data: existingModules } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (existingModules) {
      if (existingModules.status === 'active') {
        console.log('이미 활성화된 모듈입니다.');
        return true;
      } else if (existingModules.status === 'suspended') {
        // 정지된 모듈이라면 다시 활성화
        const { error } = await supabase
          .from('company_modules')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingModules.id);
        
        if (error) {
          console.error('모듈 재활성화 오류:', error);
          return false;
        }
        
        // 활성화 훅 호출
        if (lifecycleHandlers?.onEnable) {
          await lifecycleHandlers.onEnable(companyId);
        }
        
        return true;
      }
    }
    
    // 모듈 정보 조회
    const { data: moduleInfo, error: moduleError } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('id', moduleId)
      .single();
    
    if (moduleError || !moduleInfo) {
      console.error('모듈 정보 조회 오류:', moduleError);
      return false;
    }
    
    // 회사-모듈 구독 생성
    const { error: subscriptionError } = await supabase
      .from('company_modules')
      .insert({
        company_id: companyId,
        module_id: moduleId,
        status: moduleInfo.requires_approval ? 'pending' : 'active',
        start_date: new Date().toISOString(),
        payment_status: 'free', // 기본값, 필요에 따라 변경
      });
    
    if (subscriptionError) {
      console.error('모듈 구독 생성 오류:', subscriptionError);
      return false;
    }
    
    // 메뉴 아이템 조회
    const { data: menuItems } = await supabase
      .from('module_menu_items')
      .select('id')
      .eq('module_id', moduleId);
    
    if (menuItems && menuItems.length > 0) {
      // 회사별 메뉴 설정 생성
      const companyMenuSettings = menuItems.map((item) => ({
        company_id: companyId,
        menu_item_id: item.id,
        is_visible: true,
      }));
      
      await supabase
        .from('company_menu_settings')
        .insert(companyMenuSettings);
    }
    
    // 이벤트 구독 템플릿을 회사별 구독으로 복사
    const { data: eventSubscriptions } = await supabase
      .from('module_event_subscriptions_template')
      .select('*')
      .eq('module_id', moduleId);
    
    if (eventSubscriptions && eventSubscriptions.length > 0) {
      const companyEventSubscriptions = eventSubscriptions.map((sub) => ({
        company_id: companyId,
        module_id: moduleId,
        event_type: sub.event_type,
        source_module_id: sub.source_module_id,
        is_active: true,
      }));
      
      await supabase
        .from('module_event_subscriptions')
        .insert(companyEventSubscriptions);
    }
    
    // 설치 훅 호출
    if (!moduleInfo.requires_approval && lifecycleHandlers?.onInstall) {
      await lifecycleHandlers.onInstall(companyId);
    }
    
    return true;
  } catch (error) {
    console.error('모듈 설치 오류:', error);
    return false;
  }
}

/**
 * 회사에서 모듈을 제거합니다.
 * 
 * @param companyId 대상 회사 ID
 * @param moduleId 제거할 모듈 ID
 * @param lifecycleHandlers 모듈 라이프사이클 핸들러 (선택사항)
 */
export async function uninstallModule(
  companyId: string,
  moduleId: string,
  lifecycleHandlers?: ModuleLifecycle
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 구독 정보 확인
    const { data: subscription, error: subError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (subError || !subscription) {
      console.error('모듈 구독 정보 조회 오류:', subError);
      return false;
    }
    
    // 제거 전 훅 호출
    if (lifecycleHandlers?.onUninstall) {
      await lifecycleHandlers.onUninstall(companyId);
    }
    
    // 모듈 구독 취소 (완전 삭제가 아닌 상태 변경)
    const { error: updateError } = await supabase
      .from('company_modules')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
    
    if (updateError) {
      console.error('모듈 구독 취소 오류:', updateError);
      return false;
    }
    
    // 회사별 메뉴 설정 비활성화
    await supabase
      .from('company_menu_settings')
      .update({ is_visible: false })
      .eq('company_id', companyId)
      .in('menu_item_id', supabase.from('module_menu_items').select('id').eq('module_id', moduleId));
    
    // 회사별 이벤트 구독 비활성화
    await supabase
      .from('module_event_subscriptions')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    return true;
  } catch (error) {
    console.error('모듈 제거 오류:', error);
    return false;
  }
}

/**
 * 모듈을 비활성화합니다.
 * 
 * @param companyId 대상 회사 ID
 * @param moduleId 비활성화할 모듈 ID
 * @param lifecycleHandlers 모듈 라이프사이클 핸들러 (선택사항)
 */
export async function disableModule(
  companyId: string,
  moduleId: string,
  lifecycleHandlers?: ModuleLifecycle
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 구독 정보 확인
    const { data: subscription, error: subError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (subError || !subscription) {
      console.error('모듈 구독 정보 조회 오류:', subError);
      return false;
    }
    
    if (subscription.status !== 'active') {
      console.log('이미 비활성화된 모듈입니다.');
      return true;
    }
    
    // 비활성화 전 훅 호출
    if (lifecycleHandlers?.onDisable) {
      await lifecycleHandlers.onDisable(companyId);
    }
    
    // 모듈 구독 상태 변경
    const { error: updateError } = await supabase
      .from('company_modules')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
    
    if (updateError) {
      console.error('모듈 비활성화 오류:', updateError);
      return false;
    }
    
    // 회사별 메뉴 설정 비활성화
    await supabase
      .from('company_menu_settings')
      .update({ is_visible: false })
      .eq('company_id', companyId)
      .in('menu_item_id', supabase.from('module_menu_items').select('id').eq('module_id', moduleId));
    
    // 회사별 이벤트 구독 비활성화
    await supabase
      .from('module_event_subscriptions')
      .update({ is_active: false })
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    return true;
  } catch (error) {
    console.error('모듈 비활성화 오류:', error);
    return false;
  }
}

/**
 * 모듈을 활성화합니다.
 * 
 * @param companyId 대상 회사 ID
 * @param moduleId 활성화할 모듈 ID
 * @param lifecycleHandlers 모듈 라이프사이클 핸들러 (선택사항)
 */
export async function enableModule(
  companyId: string,
  moduleId: string,
  lifecycleHandlers?: ModuleLifecycle
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 구독 정보 확인
    const { data: subscription, error: subError } = await supabase
      .from('company_modules')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (subError || !subscription) {
      console.error('모듈 구독 정보 조회 오류:', subError);
      return false;
    }
    
    if (subscription.status === 'active') {
      console.log('이미 활성화된 모듈입니다.');
      return true;
    }
    
    if (subscription.status === 'cancelled') {
      console.log('취소된 모듈은 다시 설치해야 합니다.');
      return false;
    }
    
    // 모듈 구독 상태 변경
    const { error: updateError } = await supabase
      .from('company_modules')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);
    
    if (updateError) {
      console.error('모듈 활성화 오류:', updateError);
      return false;
    }
    
    // 회사별 메뉴 설정 활성화
    await supabase
      .from('company_menu_settings')
      .update({ is_visible: true })
      .eq('company_id', companyId)
      .in('menu_item_id', supabase.from('module_menu_items').select('id').eq('module_id', moduleId));
    
    // 회사별 이벤트 구독 활성화
    await supabase
      .from('module_event_subscriptions')
      .update({ is_active: true })
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    // 활성화 후 훅 호출
    if (lifecycleHandlers?.onEnable) {
      await lifecycleHandlers.onEnable(companyId);
    }
    
    return true;
  } catch (error) {
    console.error('모듈 활성화 오류:', error);
    return false;
  }
}

/**
 * 모듈을 업데이트합니다.
 * 
 * @param companyId 대상 회사 ID
 * @param moduleId 업데이트할 모듈 ID
 * @param lifecycleHandlers 모듈 라이프사이클 핸들러 (선택사항)
 */
export async function updateModule(
  companyId: string,
  moduleId: string,
  lifecycleHandlers?: ModuleLifecycle
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // 현재 회사-모듈 구독 정보
    const { data: subscription, error: subError } = await supabase
      .from('company_modules')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .single();
    
    if (subError || !subscription) {
      console.error('모듈 구독 정보 조회 오류:', subError);
      return false;
    }
    
    // 최신 모듈 정보
    const { data: moduleInfo, error: moduleError } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('id', moduleId)
      .single();
    
    if (moduleError || !moduleInfo) {
      console.error('모듈 정보 조회 오류:', moduleError);
      return false;
    }
    
    // 버전이 다른 경우에만 업데이트 훅 호출
    if (subscription.version !== moduleInfo.version) {
      // 업데이트 훅 호출
      if (lifecycleHandlers?.onUpdate) {
        await lifecycleHandlers.onUpdate(companyId, subscription.version, moduleInfo.version);
      }
      
      // 버전 정보 업데이트
      await supabase
        .from('company_modules')
        .update({
          version: moduleInfo.version,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }
    
    return true;
  } catch (error) {
    console.error('모듈 업데이트 오류:', error);
    return false;
  }
} 