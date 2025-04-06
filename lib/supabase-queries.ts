import { Company } from '@/lib/types';
import { createServerSupabaseClient } from '@/lib/supabase';

interface CompanyWithRole extends Company {
  role: string;
}

// 사용자가 속한 회사 목록을 가져오는 함수
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
    
    // 회사 정보 조회
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds);
    
    if (companiesError) {
      console.error('회사 정보 조회 오류:', companiesError);
      return { companies: [], error: new Error(companiesError.message) };
    }
    
    // 회사 정보와 역할 정보 합치기
    const companiesWithRole = companies.map(company => {
      const membership = memberships.find(m => m.company_id === company.id);
      return {
        ...company,
        role: membership ? membership.role : 'unknown'
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