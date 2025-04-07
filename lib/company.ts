import { createServerSupabaseClient } from "@/lib/supabase";
import { Company } from "@/lib/types";

/**
 * 사용자가 속한 기본 회사 정보를 가져오는 함수
 * @param userId 사용자 ID
 * @returns 회사 정보 또는 null
 */
export async function getCompany(userId: string): Promise<Company | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    // 사용자가 속한 회사 ID 목록을 먼저 조회
    const { data: memberships, error: membershipError } = await supabase
      .from("company_memberships")
      .select("company_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (membershipError || !memberships || memberships.length === 0) {
      return null;
    }
    
    // 첫 번째 회사 정보 조회
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", memberships[0].company_id)
      .single();
    
    if (companyError || !company) {
      return null;
    }
    
    return company as Company;
  } catch (error) {
    console.error("회사 정보 조회 중 오류 발생:", error);
    return null;
  }
} 