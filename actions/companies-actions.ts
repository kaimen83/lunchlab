import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * 서버 컴포넌트에서 회사 정보를 조회합니다.
 * 
 * @param companyId 회사 ID
 * @returns 회사 정보 또는 null
 */
export async function getServerCompany(companyId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) {
      console.error('[getServerCompany] 회사 조회 오류:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[getServerCompany] 오류 발생:', error);
    return null;
  }
}

/**
 * 서버 컴포넌트에서 모든 회사 목록을 조회합니다.
 * 
 * @returns 회사 목록 배열
 */
export async function getAllCompanies() {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('[getAllCompanies] 회사 목록 조회 오류:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[getAllCompanies] 오류 발생:', error);
    return [];
  }
}

/**
 * 사용자가 속한 회사 목록을 조회합니다.
 * 
 * @param userId 사용자 ID
 * @returns 회사 목록과 사용자 역할이 포함된 배열
 */
export async function getUserCompanies(userId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_memberships')
      .select(`
        companies:company_id(id, name, logo_url, description),
        role
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('[getUserCompanies] 회사 멤버십 조회 오류:', error);
      return [];
    }
    
    return data?.map(item => ({
      ...item.companies,
      role: item.role
    })) || [];
  } catch (error) {
    console.error('[getUserCompanies] 오류 발생:', error);
    return [];
  }
} 