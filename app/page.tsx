import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { getUserRole, getUserProfileStatus } from "@/lib/clerk";
import { getUserCompanies } from "@/lib/supabase-queries";
import { CompanyList } from "@/components/company/CompanyList";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// 로딩 상태 표시를 위한 스켈레톤 컴포넌트
function CompanyListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-1/3 bg-muted rounded mx-auto mb-8"></div>
      <div className="h-10 w-full bg-muted rounded mb-6"></div>
      <div className="h-24 w-full bg-muted rounded"></div>
      <div className="h-24 w-full bg-muted rounded"></div>
    </div>
  );
}

export default async function Home() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자 권한 및 프로필 완료 여부 확인 - 병렬 요청으로 변경
  const [userRole, profileCompleted] = await Promise.all([
    getUserRole(userId),
    getUserProfileStatus(userId)
  ]);
  
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  
  // 사용자의 회사 목록 조회는 클라이언트 컴포넌트에서 처리하도록 변경
  return (
    <>
      <Suspense fallback={<CompanyListSkeleton />}>
        <CompanyList 
          userId={userId} 
          userCanCreateCompany={userCanCreateCompany} 
          showProfileModal={!profileCompleted} 
        />
      </Suspense>
    </>
  );
}
