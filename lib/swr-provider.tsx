'use client';

import { SWRConfig } from 'swr';

// SWR 설정을 위한 fetcher 함수
const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  // 응답이 성공적이지 않으면 에러 발생
  if (!res.ok) {
    const error = new Error('API 요청 중 오류가 발생했습니다');
    throw error;
  }
  
  return res.json();
};

interface SWRProviderProps {
  children: React.ReactNode;
}

/**
 * 전역 SWR 설정을 제공하는 프로바이더 컴포넌트
 * - 네트워크 요청 결과를 캐싱하여 탭 간 전환 시 동일한 요청의 재요청을 방지
 * - revalidateOnFocus: false - 탭 포커스 시 자동 재검증 비활성화
 * - dedupingInterval: 10000 - 10초 동안 중복 요청 방지
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig 
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
        keepPreviousData: true
      }}
    >
      {children}
    </SWRConfig>
  );
} 