import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserCompanies } from "@/lib/supabase-queries";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { getCompaniesModuleMenus } from "@/lib/marketplace/sidebar";

interface CompaniesLayoutProps {
  children: React.ReactNode;
  params: Promise<{}>;
}

export default async function CompaniesLayout({
  children,
  params,
}: CompaniesLayoutProps) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자의 회사 목록 조회
  const { companies, error } = await getUserCompanies(userId);
  
  // 오류가 있는 경우 콘솔에 로그
  if (error) {
    console.error('회사 목록 조회 중 오류:', error);
  }

  // 회사 ID 목록 생성
  const companyIds = companies.map(company => company.id);
  
  // 회사별 모듈 메뉴 아이템 조회
  const { companyModules, error: modulesError } = await getCompaniesModuleMenus(companyIds);
  
  if (modulesError) {
    console.error('모듈 메뉴 아이템 조회 중 오류:', modulesError);
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 왼쪽 사이드바 - 회사 목록 */}
      <div className="w-60 bg-[#19171D] border-r border-gray-700 flex-shrink-0 overflow-y-auto">
        <DynamicSidebar companies={companies} companyModules={companyModules} />
      </div>
      
      {/* 오른쪽 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {children}
      </div>
    </div>
  );
} 