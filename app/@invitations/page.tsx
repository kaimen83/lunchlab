'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

/**
 * 초대 관리 페이지 병렬 라우트 컴포넌트
 * - 초대 목록 데이터를 SWR로 캐싱하여 탭 전환 시 빠른 응답 제공
 * - 네비게이션 시 캐시된 데이터 활용
 */
export default function InvitationsPage() {
  const [isVisible, setIsVisible] = useState(false);
  
  // 화면에 표시될 때만 API 호출 및 데이터 로드
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    const invitationsTab = document.getElementById('invitations-tab');
    if (invitationsTab) {
      observer.observe(invitationsTab);
    }
    
    return () => {
      if (invitationsTab) {
        observer.unobserve(invitationsTab);
      }
    };
  }, []);
  
  // API로부터 데이터 가져오기 (SWR로 캐싱)
  const { data: invitationsData, error } = useSWR(
    isVisible ? '/api/invitations/list' : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1분 동안 중복 요청 방지
    }
  );
  
  // 로딩 상태, 에러 처리, 데이터 표시 구현

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">초대 관리</h1>
      <p className="text-gray-600">
        초대 관리 페이지 콘텐츠입니다.
        이 페이지는 탭 전환 시 캐싱되어 빠르게 로드됩니다.
      </p>
      
      {/* 초대 목록 콘텐츠 */}
    </div>
  );
} 