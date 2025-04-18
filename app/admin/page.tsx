import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getUserRole } from '@/lib/clerk';

/**
 * 관리자 페이지
 * - 이 페이지는 병렬 라우트 구현에 의해 미리 로드되고 캐싱됨
 */
export default async function AdminPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 사용자 권한 확인
  const userRole = await getUserRole(userId);
  
  if (userRole !== 'headAdmin') {
    redirect('/');
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">관리자 대시보드</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">사용자 통계</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-600">총 사용자</p>
              <p className="text-2xl font-bold">120</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-green-600">활성 사용자</p>
              <p className="text-2xl font-bold">87</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-sm text-purple-600">총 회사</p>
              <p className="text-2xl font-bold">45</p>
            </div>
            <div className="bg-amber-50 p-3 rounded">
              <p className="text-sm text-amber-600">대기 중 초대</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
          <ul className="space-y-3">
            <li className="border-b pb-2">
              <p className="text-sm"><span className="font-medium">김철수</span>님이 <span className="font-medium">테스트 회사</span>에 가입했습니다.</p>
              <p className="text-xs text-gray-500">방금 전</p>
            </li>
            <li className="border-b pb-2">
              <p className="text-sm"><span className="font-medium">박영희</span>님이 <span className="font-medium">새 회사</span>를 생성했습니다.</p>
              <p className="text-xs text-gray-500">10분 전</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 