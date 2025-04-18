import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUserRole, getUserProfileStatus } from "@/lib/clerk";

/**
 * 서버 컴포넌트 - 초기 인증 및 리다이렉트 처리
 */
export default async function Home() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 사용자 권한 및 프로필 완료 여부 확인
  const [userRole, profileCompleted] = await Promise.all([
    getUserRole(userId),
    getUserProfileStatus(userId)
  ]);
  
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">LunchLab</h1>
        <p className="text-gray-600 mb-4">
          네비게이션 탭을 클릭하면 캐싱된 데이터가 로드되어 빠르게 탭 전환이 가능합니다.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">최적화 기능</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>병렬 라우트를 통한 탭 콘텐츠 프리로드</li>
              <li>SWR 라이브러리를 활용한 데이터 캐싱</li>
              <li>IntersectionObserver를 활용한 지연 로딩</li>
              <li>탭 간 전환 시 부드러운 상태 유지</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">사용 방법</h2>
            <p className="text-sm text-gray-600">
              상단 네비게이션 바에서 '관리자' 또는 '초대 관리' 탭을 클릭하여 
              캐싱된 페이지로 빠르게 전환해보세요.
            </p>
          </div>
        </div>
      </div>
      
      {/* 서버 컴포넌트 - 회사 목록 */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">내 회사 목록</h2>
        <p className="text-gray-600">
          여기에 회사 목록이 표시됩니다.
        </p>
      </div>
    </div>
  );
}
