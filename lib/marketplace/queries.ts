import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  MarketplaceModule,
  ModuleFeature,
  CompanyModule,
  ModuleSetting,
  ModuleMenuItem,
  CompanyMenuSetting,
  ModuleSubscriptionStatus
} from '@/lib/types';

/**
 * 모든 활성화된 마켓플레이스 모듈 목록을 가져오는 함수
 */
export async function getMarketplaceModules(): Promise<{
  modules: MarketplaceModule[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('마켓플레이스 모듈 조회 오류:', error);
      return { modules: [], error: new Error(error.message) };
    }
    
    return { modules: data || [], error: null };
  } catch (error) {
    console.error('마켓플레이스 모듈 조회 중 오류 발생:', error);
    return { 
      modules: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 특정 마켓플레이스 모듈 정보를 가져오는 함수
 */
export async function getMarketplaceModule(moduleId: string): Promise<{
  module: MarketplaceModule | null;
  features: ModuleFeature[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 모듈 정보 조회
    const { data: module, error: moduleError } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('id', moduleId)
      .single();
    
    if (moduleError) {
      console.error('마켓플레이스 모듈 조회 오류:', moduleError);
      return { module: null, features: [], error: new Error(moduleError.message) };
    }
    
    // 모듈 기능 조회
    const { data: features, error: featuresError } = await supabase
      .from('module_features')
      .select('*')
      .eq('module_id', moduleId)
      .order('name');
    
    if (featuresError) {
      console.error('모듈 기능 조회 오류:', featuresError);
      return { module, features: [], error: new Error(featuresError.message) };
    }
    
    return { module, features: features || [], error: null };
  } catch (error) {
    console.error('마켓플레이스 모듈 조회 중 오류 발생:', error);
    return { 
      module: null,
      features: [],
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사가 구독 중인 모듈 목록을 가져오는 함수
 */
export async function getCompanyModules(companyId: string): Promise<{
  modules: (MarketplaceModule & { subscription_status: ModuleSubscriptionStatus })[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 회사-모듈 구독 정보와 모듈 정보를 조인하여 조회
    const { data, error } = await supabase
      .from('company_modules')
      .select(`
        status,
        start_date,
        end_date,
        payment_status,
        marketplace_modules (*)
      `)
      .eq('company_id', companyId);
    
    if (error) {
      console.error('회사 모듈 구독 정보 조회 오류:', error);
      return { modules: [], error: new Error(error.message) };
    }
    
    // 결과 데이터 형식 변환
    const modules = data.map(item => {
      if (!item.marketplace_modules) return null;
      return {
        ...(item.marketplace_modules as unknown as MarketplaceModule),
        subscription_status: item.status as ModuleSubscriptionStatus
      };
    }).filter((module): module is (MarketplaceModule & { subscription_status: ModuleSubscriptionStatus }) => module !== null);
    
    return { modules, error: null };
  } catch (error) {
    console.error('회사 모듈 구독 정보 조회 중 오류 발생:', error);
    return { 
      modules: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 특정 모듈 구독 정보 조회
 */
export async function getCompanyModuleSubscription(companyId: string, moduleId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_modules')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        marketplace_modules (
          id,
          name,
          description,
          icon_url,
          category
        )
      `)
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .maybeSingle();
    
    if (error) {
      console.error('모듈 구독 조회 오류:', error);
      return { error: error.message };
    }
    
    if (!data) {
      return { subscription: null };
    }
    
    const subscription = {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      module: data.marketplace_modules
    };
    
    return { subscription };
  } catch (error) {
    console.error('모듈 구독 조회 오류:', error);
    return { error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 회사-모듈 구독을 생성/업데이트하는 함수
 */
export async function subscribeCompanyToModule(
  companyId: string, 
  moduleId: string, 
  userId: string
): Promise<{
  subscription: CompanyModule | null;
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 기존 구독 정보 확인
    const { subscription: existingSubscription } = await getCompanyModuleSubscription(companyId, moduleId);
    
    if (existingSubscription) {
      // 이미 구독 중인 경우, 취소된 구독이면 활성화
      if (existingSubscription.status === 'cancelled') {
        const { data, error } = await supabase
          .from('company_modules')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
          .eq('module_id', moduleId)
          .select()
          .single();
        
        if (error) {
          console.error('모듈 구독 업데이트 오류:', error);
          return { subscription: null, error: new Error(error.message) };
        }
        
        return { subscription: data, error: null };
      }
      
      // 이미 활성 구독 중인 경우, 그대로 반환하지만 CompanyModule 형식에 맞춰 변환
      const companyModuleSubscription: CompanyModule = {
        company_id: companyId,
        module_id: moduleId,
        status: existingSubscription.status,
        created_at: existingSubscription.createdAt,
        updated_at: existingSubscription.updatedAt,
        // 기본값 설정
        start_date: new Date().toISOString(),
        end_date: undefined,
        payment_status: 'free',
        id: existingSubscription.id
      };
      
      return { subscription: companyModuleSubscription, error: null };
    }
    
    // 모듈 정보 확인 (승인 필요 여부)
    const { data: moduleData, error: moduleError } = await supabase
      .from('marketplace_modules')
      .select('requires_approval')
      .eq('id', moduleId)
      .single();
    
    if (moduleError) {
      console.error('모듈 정보 조회 오류:', moduleError);
      return { subscription: null, error: new Error(moduleError.message) };
    }
    
    // 구독 상태 결정 (승인 필요시 pending, 아니면 active)
    const status = moduleData.requires_approval ? 'pending' : 'active';
    
    // 새 구독 생성
    const { data, error } = await supabase
      .from('company_modules')
      .insert({
        company_id: companyId,
        module_id: moduleId,
        status,
        start_date: new Date().toISOString(),
        payment_status: 'free', // 기본값은 무료
        created_by: userId
      })
      .select()
      .single();
    
    if (error) {
      console.error('모듈 구독 생성 오류:', error);
      return { subscription: null, error: new Error(error.message) };
    }
    
    return { subscription: data, error: null };
  } catch (error) {
    console.error('모듈 구독 생성 중 오류 발생:', error);
    return { 
      subscription: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 모듈 구독 취소
 */
export async function unsubscribeCompanyFromModule(companyId: string, moduleId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 1. 구독 상태를 'cancelled'로 변경
    const { error } = await supabase
      .from('company_modules')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    if (error) {
      console.error('모듈 구독 취소 오류:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('모듈 구독 취소 오류:', error);
    return { success: false, error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 모듈의 메뉴 아이템 목록을 가져오는 함수
 */
export async function getModuleMenuItems(moduleId: string): Promise<{
  menuItems: ModuleMenuItem[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_menu_items')
      .select('*')
      .eq('module_id', moduleId)
      .order('display_order');
    
    if (error) {
      console.error('모듈 메뉴 아이템 조회 오류:', error);
      return { menuItems: [], error: new Error(error.message) };
    }
    
    return { menuItems: data || [], error: null };
  } catch (error) {
    console.error('모듈 메뉴 아이템 조회 중 오류 발생:', error);
    return { 
      menuItems: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 특정 모듈 설정을 가져오는 함수
 */
export async function getModuleSettings(companyId: string, moduleId: string): Promise<{
  settings: ModuleSetting[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('module_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', moduleId);
    
    if (error) {
      console.error('모듈 설정 조회 오류:', error);
      return { settings: [], error: new Error(error.message) };
    }
    
    return { settings: data || [], error: null };
  } catch (error) {
    console.error('모듈 설정 조회 중 오류 발생:', error);
    return { 
      settings: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 모듈 설정을 업데이트하는 함수
 */
export async function updateModuleSetting(
  companyId: string, 
  moduleId: string, 
  key: string, 
  value: string
): Promise<{
  setting: ModuleSetting | null;
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 기존 설정 확인
    const { data: existingSetting, error: checkError } = await supabase
      .from('module_settings')
      .select()
      .eq('company_id', companyId)
      .eq('module_id', moduleId)
      .eq('key', key)
      .maybeSingle();
    
    if (checkError) {
      console.error('모듈 설정 확인 오류:', checkError);
      return { setting: null, error: new Error(checkError.message) };
    }
    
    let result;
    
    if (existingSetting) {
      // 기존 설정 업데이트
      const { data, error } = await supabase
        .from('module_settings')
        .update({
          value,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSetting.id)
        .select()
        .single();
      
      if (error) {
        console.error('모듈 설정 업데이트 오류:', error);
        return { setting: null, error: new Error(error.message) };
      }
      
      result = data;
    } else {
      // 새 설정 생성
      const { data, error } = await supabase
        .from('module_settings')
        .insert({
          company_id: companyId,
          module_id: moduleId,
          key,
          value
        })
        .select()
        .single();
      
      if (error) {
        console.error('모듈 설정 생성 오류:', error);
        return { setting: null, error: new Error(error.message) };
      }
      
      result = data;
    }
    
    return { setting: result, error: null };
  } catch (error) {
    console.error('모듈 설정 업데이트 중 오류 발생:', error);
    return { 
      setting: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 메뉴 설정을 가져오는 함수
 */
export async function getCompanyMenuSettings(companyId: string): Promise<{
  menuSettings: CompanyMenuSetting[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_menu_settings')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.error('회사 메뉴 설정 조회 오류:', error);
      return { menuSettings: [], error: new Error(error.message) };
    }
    
    return { menuSettings: data || [], error: null };
  } catch (error) {
    console.error('회사 메뉴 설정 조회 중 오류 발생:', error);
    return { 
      menuSettings: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 회사의 메뉴 설정을 업데이트하는 함수
 */
export async function updateCompanyMenuSetting(
  companyId: string,
  menuItemId: string,
  isVisible: boolean,
  displayOrder?: number
): Promise<{
  menuSetting: CompanyMenuSetting | null;
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 기존 설정 확인
    const { data: existingSetting, error: checkError } = await supabase
      .from('company_menu_settings')
      .select()
      .eq('company_id', companyId)
      .eq('menu_item_id', menuItemId)
      .maybeSingle();
    
    if (checkError) {
      console.error('메뉴 설정 확인 오류:', checkError);
      return { menuSetting: null, error: new Error(checkError.message) };
    }
    
    let result;
    
    if (existingSetting) {
      // 기존 설정 업데이트
      const { data, error } = await supabase
        .from('company_menu_settings')
        .update({
          is_visible: isVisible,
          display_order: displayOrder !== undefined ? displayOrder : existingSetting.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSetting.id)
        .select()
        .single();
      
      if (error) {
        console.error('메뉴 설정 업데이트 오류:', error);
        return { menuSetting: null, error: new Error(error.message) };
      }
      
      result = data;
    } else {
      // 새 설정 생성
      const { data, error } = await supabase
        .from('company_menu_settings')
        .insert({
          company_id: companyId,
          menu_item_id: menuItemId,
          is_visible: isVisible,
          display_order: displayOrder
        })
        .select()
        .single();
      
      if (error) {
        console.error('메뉴 설정 생성 오류:', error);
        return { menuSetting: null, error: new Error(error.message) };
      }
      
      result = data;
    }
    
    return { menuSetting: result, error: null };
  } catch (error) {
    console.error('메뉴 설정 업데이트 중 오류 발생:', error);
    return { 
      menuSetting: null, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * 특정 모듈에 대한 모든 구독 정보를 조회
 */
export async function getModuleSubscriptionsByModuleId(moduleId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_modules')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        companies (
          id,
          name,
          logo_url
        )
      `)
      .eq('module_id', moduleId);
    
    if (error) {
      console.error('모듈 구독 조회 오류:', error);
      return { error: error.message };
    }
    
    const subscriptions = data.map(item => ({
      id: item.id,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      company: item.companies
    }));
    
    return { subscriptions };
  } catch (error) {
    console.error('모듈 구독 조회 오류:', error);
    return { error: '서버 오류가 발생했습니다.' };
  }
}

/**
 * 모듈을 검색하는 함수
 */
export async function searchMarketplaceModules(query: string): Promise<{
  modules: MarketplaceModule[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    const searchTerm = query.trim().toLowerCase();
    
    // 이름, 설명, 카테고리를 기준으로 검색
    const { data, error } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order('name');
    
    if (error) {
      console.error('모듈 검색 오류:', error);
      return { modules: [], error: new Error(error.message) };
    }
    
    return { modules: data || [], error: null };
  } catch (error) {
    console.error('모듈 검색 중 오류 발생:', error);
    return { 
      modules: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
} 