import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

/**
 * 초대 관리 페이지
 * - 이 페이지는 병렬 라우트 구현에 의해 미리 로드되고 캐싱됨
 */
export default async function InvitationsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">초대 관리</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">보낸 초대</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">test1@example.com</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">테스트 회사</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">대기 중</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">test2@example.com</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">테스트 회사</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">수락됨</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">받은 초대</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">보낸 사람</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">홍길동</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">새 회사</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 hover:bg-blue-200">수락</button>
                      <button className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 hover:bg-red-200">거절</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 