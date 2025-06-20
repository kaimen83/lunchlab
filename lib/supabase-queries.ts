import { Company } from '@/lib/types';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyJoinRequest } from './types';

interface CompanyFeature {
  feature_name: string;
  is_enabled: boolean;
}

interface CompanyWithRole extends Company {
  role: string;
  features: CompanyFeature[];
}

// 사용자가 속한 회사 목록과 기능 정보를 함께 가져오는 함수
export async function getUserCompanies(userId: string): Promise<{
  companies: CompanyWithRole[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 사용자가 속한 회사 ID 목록을 먼저 조회
    const { data: memberships, error: membershipError } = await supabase
      .from('company_memberships')
      .select('company_id, role')
      .eq('user_id', userId);
    
    if (membershipError) {
      console.error('회사 멤버십 조회 오류:', membershipError);
      return { companies: [], error: new Error(membershipError.message) };
    }
    
    if (memberships.length === 0) {
      return { companies: [], error: null };
    }
    
    // 회사 ID 배열 추출
    const companyIds = memberships.map(m => m.company_id);
    
    // 회사 정보와 기능 정보를 JOIN하여 한 번에 조회
    const { data: companiesWithFeatures, error: companiesError } = await supabase
      .from('companies')
      .select(`
        *,
        company_features (
          feature_name,
          is_enabled
        )
      `)
      .in('id', companyIds);
    
    if (companiesError) {
      console.error('회사 정보 조회 오류:', companiesError);
      return { companies: [], error: new Error(companiesError.message) };
    }
    
    // 회사 정보와 역할 정보, 기능 정보 합치기
    const companiesWithRole = companiesWithFeatures.map(company => {
      const membership = memberships.find(m => m.company_id === company.id);
      const features = (company.company_features || [])
        .filter((feature: any) => feature.is_enabled)
        .map((feature: any) => ({
          feature_name: feature.feature_name,
          is_enabled: feature.is_enabled
        }));
      
      return {
        ...company,
        role: membership ? membership.role : 'unknown',
        features,
        company_features: undefined // 원본 데이터 제거
      } as CompanyWithRole;
    });
    
    return { companies: companiesWithRole, error: null };
  } catch (error) {
    console.error('회사 목록 조회 중 오류 발생:', error);
    return { 
      companies: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

// 사용자가 신청한 회사 가입 신청 목록을 가져오는 함수
export async function getUserJoinRequests(userId: string): Promise<{
  requests: CompanyJoinRequest[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 사용자의 가입 신청 목록 조회
    const { data: requests, error } = await supabase
      .from('company_join_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('가입 신청 목록 조회 오류:', error);
      return { requests: [], error: new Error(error.message) };
    }
    
    return { requests: requests || [], error: null };
  } catch (error) {
    console.error('가입 신청 목록 조회 중 오류 발생:', error);
    return { 
      requests: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

// 회사의 가입 신청 목록을 가져오는 함수
export async function getCompanyJoinRequests(companyId: string): Promise<{
  requests: CompanyJoinRequest[];
  error: Error | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 회사의 가입 신청 목록 조회
    const { data: requests, error } = await supabase
      .from('company_join_requests')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending') // 대기 중인 신청만 가져옴
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('회사 가입 신청 목록 조회 오류:', error);
      return { requests: [], error: new Error(error.message) };
    }
    
    return { requests: requests || [], error: null };
  } catch (error) {
    console.error('회사 가입 신청 목록 조회 중 오류 발생:', error);
    return { 
      requests: [], 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
} 