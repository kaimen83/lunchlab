import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { RoleDisplay } from "@/components/RoleDisplay";
import { RoleGuidance } from "@/components/RoleGuidance";
import { getUserRole, getUserProfileStatus } from "@/lib/clerk";
import { getUserCompanies } from "@/lib/supabase-queries";
import Link from "next/link";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { Building, Plus } from "lucide-react";
import { MyCompanyList } from "@/components/MyCompanyList";

export default async function Home() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자 권한 및 프로필 완료 여부 확인
  const userRole = await getUserRole(userId);
  const userIsAdmin = userRole === 'headAdmin';
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  const profileCompleted = await getUserProfileStatus(userId);

  // 사용자의 회사 목록 조회
  const { companies, error } = await getUserCompanies(userId);
  
  // 오류가 있는 경우 콘솔에 로그
  if (error) {
    console.error('회사 목록 조회 중 오류:', error);
  }

  // 프로필이 완료되지 않은 경우에만 모달 표시
  const showProfileModal = !profileCompleted;

  return (
    <>
      {showProfileModal && <ProfileSetupModal />}
      
      <div className="flex flex-col items-center justify-center pt-20 pb-10 px-4">
        <h1 className="text-4xl font-bold mb-4">안녕하세요!</h1>
        <p className="text-xl mb-6">Clerk 인증이 성공적으로 완료되었습니다.</p>
        
        <RoleDisplay />
        
        <div className="mt-8 space-y-4">
          {userIsAdmin && (
            <Link href="/admin" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
              관리자 페이지로 이동
            </Link>
          )}
          
          {userCanCreateCompany && (
            <Link href="/companies/new" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              <Building className="w-4 h-4 mr-2" />
              회사 페이지 생성하기
            </Link>
          )}
        </div>
        
        {/* 내 회사 목록 표시 */}
        <MyCompanyList companies={companies} />
        
        {/* 클라이언트 컴포넌트로 역할별 안내 문구 표시 */}
        <RoleGuidance />
      </div>
    </>
  );
}
