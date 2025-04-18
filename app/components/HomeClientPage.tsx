'use client';

import { useEffect } from 'react';
import useSWR from 'swr';

/**
 * 홈 페이지 클라이언트 컴포넌트
 * - SWR을 사용하여 데이터 캐싱
 * - 탭 데이터를 미리 로드하여 네비게이션 최적화
 */
export function HomeClientPage() {
  // API로부터 데이터 가져오기 (SWR로 캐싱)
  const { data: homeData, error } = useSWR('/api/home', {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1분 동안 중복 요청 방지
  });
  
  // 페이지 이동 전 탭 데이터 프리페치
  useEffect(() => {
    // 관리자 탭, 초대 관리 탭 데이터 미리 불러오기
    const prefetchData = async () => {
      try {
        // 필요한 데이터 미리 요청하여 SWR 캐시에 저장
        const requests = [
          fetch('/api/admin/dashboard'),
          fetch('/api/invitations/list')
        ];
        
        await Promise.all(requests);
      } catch (error) {
        console.error('데이터 프리페치 오류:', error);
      }
    };
    
    prefetchData();
  }, []);
  
  return (
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
  );
} 