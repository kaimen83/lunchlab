import { createServerSupabaseClient } from '@/lib/supabase';

type FeatureName = 'ingredients' | 'menus' | 'scheduling' | 'reporting';

/**
 * 회사에 특정 기능이 활성화되어 있는지 확인합니다.
 * 
 * @param featureName 확인할 기능 이름
 * @param companyId 회사 ID
 * @returns 기능 활성화 여부 (boolean)
 */
export async function isFeatureEnabled(featureName: FeatureName, companyId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', featureName)
      .maybeSingle();
    
    if (error) {
      console.error(`[isFeatureEnabled] 기능 확인 오류:`, error);
      return false;
    }
    
    return data?.is_enabled || false;
  } catch (error) {
    console.error(`[isFeatureEnabled] 오류 발생:`, error);
    return false;
  }
}

/**
 * 회사의 기능 설정에서 설정값을 조회합니다.
 * 
 * @param featureName 확인할 기능 이름
 * @param companyId 회사 ID
 * @param key 설정 키 (설정 객체 내부의 특정 값)
 * @param defaultValue 기본값 (설정이 없거나 오류 발생시 반환될 값)
 * @returns 설정값
 */
export async function getFeatureConfig<T>(
  featureName: FeatureName, 
  companyId: string, 
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_features')
      .select('config')
      .eq('company_id', companyId)
      .eq('feature_name', featureName)
      .maybeSingle();
    
    if (error || !data || !data.config) {
      return defaultValue;
    }
    
    return data.config[key] as T || defaultValue;
  } catch (error) {
    console.error(`[getFeatureConfig] 오류 발생:`, error);
    return defaultValue;
  }
} 