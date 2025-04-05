import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { RoleDisplay } from "@/components/RoleDisplay";
import { isAdmin, getUserRole, getUserProfileStatus } from "@/lib/clerk";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";

export default async function Home() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자 권한 및 프로필 완료 여부 확인
  const userRole = await getUserRole(userId);
  const userIsAdmin = userRole === 'admin';
  const profileCompleted = await getUserProfileStatus(userId);

  // 프로필이 완료되지 않았고, 역할이 'pending'인 경우에만 모달 표시
  const showProfileModal = !profileCompleted && userRole === 'pending';

  return (
    <>
      {showProfileModal && <ProfileSetupModal />}
      
      <div className="flex flex-col items-center justify-center pt-20 pb-10 px-4">
        <h1 className="text-4xl font-bold mb-4">안녕하세요!</h1>
        <p className="text-xl mb-6">Clerk 인증이 성공적으로 완료되었습니다.</p>
        
        <RoleDisplay />
        
        {userIsAdmin && (
          <div className="mt-8">
            <Link href="/admin" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              관리자 페이지로 이동
            </Link>
          </div>
        )}
        
        {userRole === 'pending' && (
          <div className="mt-12 text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-3">사용 안내</h2>
            <p className="mb-3">
              현재 권한이 '가입대기' 상태입니다. 관리자에게 권한 승인을 요청하세요.
            </p>
            <p className="mb-3">
              관리자 계정을 설정하려면 <Link href="/setup-admin" className="text-blue-500 hover:underline">관리자 설정 페이지</Link>로 이동하세요.
            </p>
          </div>
        )}
        
        {userRole === 'employee' && (
          <div className="mt-12 text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-3">일반직원 안내</h2>
            <p className="mb-3">
              일반직원 권한으로 로그인하셨습니다. 일반 기능을 사용할 수 있습니다.
            </p>
          </div>
        )}
        
        {userRole === 'viewer' && (
          <div className="mt-12 text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-3">뷰어 안내</h2>
            <p className="mb-3">
              뷰어 권한으로 로그인하셨습니다. 읽기 전용으로 정보를 조회할 수 있습니다.
            </p>
          </div>
        )}
        
        {userRole === 'admin' && (
          <div className="mt-12 text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-3">관리자 안내</h2>
            <p className="mb-3">
              관리자 권한으로 로그인하셨습니다. 시스템의 모든 기능에 접근하실 수 있습니다.
            </p>
            <p className="mb-3">
              사용자 권한 관리는 <Link href="/admin" className="text-blue-500 hover:underline">관리자 페이지</Link>에서 수행할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
