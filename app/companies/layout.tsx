import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserCompanies } from "@/lib/supabase-queries";
import { CompanySidebar } from "@/components/CompanySidebar";
import { BackgroundFeatureChecker } from "../components/global/BackgroundFeatureChecker";

export default async function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자의 회사 목록과 기능 정보 조회
  const { companies, error } = await getUserCompanies(userId);
  
  // 오류가 있는 경우 콘솔에 로그
  if (error) {
    console.error('회사 목록 조회 중 오류:', error);
  }

  return (
    <>
      <BackgroundFeatureChecker companies={companies} />
      <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden">
        {/* 모바일용 사이드바 - 모바일에서만 표시, 인쇄 시 숨김 */}
        <div className="md:hidden w-full bg-[#19171D] flex-shrink-0 print:hidden">
          <CompanySidebar 
            companies={companies}
            isMobile={true}
          />
        </div>
        
        {/* 데스크톱용 사이드바 - 태블릿/데스크톱에서만 표시, 인쇄 시 숨김 */}
        <div className="hidden md:block w-60 bg-[#19171D] border-r border-gray-700 flex-shrink-0 overflow-y-auto print:hidden">
          <CompanySidebar companies={companies} />
        </div>
        
        {/* 오른쪽 콘텐츠 영역 - 인쇄 시 전체 너비 사용 */}
        <div className="flex-1 overflow-y-auto bg-white print:w-full">
          {children}
        </div>
      </div>
    </>
  );
} 