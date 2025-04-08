import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserCompanies } from "@/lib/supabase-queries";
import { CompanySidebar } from "@/components/CompanySidebar";

export default async function CompaniesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <div className="flex h-screen">
      {/* 왼쪽 사이드바 - 회사 목록 */}
      <div className="w-60 bg-[#19171D] border-r border-gray-700 flex-shrink-0 overflow-y-auto">
        <CompanySidebar companies={companies} />
      </div>
      
      {/* 오른쪽 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {children}
      </div>
    </div>
  );
} 