import { createServerSupabaseClient } from '@/lib/supabase';

interface GetUserMembershipParams {
  userId: string;
  companyId: string;
}

interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at?: string;
}

/**
 * 사용자의 특정 회사 멤버십 정보를 조회합니다.
 * 
 * @param params 파라미터 객체 (userId, companyId)
 * @returns 멤버십 정보 또는 null
 */
export async function getUserMembership({ userId, companyId }: GetUserMembershipParams): Promise<Membership | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('[getUserMembership] 멤버십 조회 오류:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[getUserMembership] 오류 발생:', error);
    return null;
  }
}

/**
 * 회사의 모든 멤버 목록을 조회합니다.
 * 
 * @param companyId 회사 ID
 * @returns 멤버십 및 사용자 정보 배열
 */
export async function getCompanyMembers(companyId: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('company_memberships')
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq('company_id', companyId)
      .order('created_at');
    
    if (error) {
      console.error('[getCompanyMembers] 회사 멤버 조회 오류:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('[getCompanyMembers] 오류 발생:', error);
    return [];
  }
}

/**
 * 사용자가 해당 회사의 관리자급(owner 또는 admin) 권한을 가지고 있는지 확인합니다.
 * 
 * @param params 파라미터 객체 (userId, companyId)
 * @returns 관리자급 권한 여부 (boolean)
 */
export async function isUserCompanyAdmin({ userId, companyId }: GetUserMembershipParams): Promise<boolean> {
  try {
    const membership = await getUserMembership({ userId, companyId });
    return !!membership && ['owner', 'admin'].includes(membership.role);
  } catch (error) {
    console.error('[isUserCompanyAdmin] 오류 발생:', error);
    return false;
  }
} 