import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Company } from '@/lib/types';
import { CompanyFeature } from './types';

interface CompanyFeatureData {
  feature_name: string;
  is_enabled: boolean;
}

export function useSidebarState(companies: Array<Company & { role: string; features: CompanyFeatureData[] }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(
    // 현재 URL에서 회사 ID 추출
    pathname.startsWith('/companies/') ? pathname.split('/')[2] : null
  );
  const [joinRequestCounts, setJoinRequestCounts] = useState<Record<string, number>>({});
  const [navigationInProgress, setNavigationInProgress] = useState<string | null>(null);

  // 사용자 권한 확인 (회사 생성 권한 체크)
  const userRole = user?.publicMetadata?.role as string;
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  
  // 현재 선택된 회사 ID 확인
  const currentCompanyId = pathname.startsWith('/companies/') ? pathname.split('/')[2] : null;

  // 가입 신청 개수 가져오기 (확장된 회사에 대해서만)
  useEffect(() => {
    const fetchJoinRequestCounts = async () => {
      try {
        if (!expandedCompanyId) return;

        // 소유자나 관리자인 회사인지 확인
        const company = companies.find(c => c.id === expandedCompanyId);
        if (!company || (company.role !== 'owner' && company.role !== 'admin')) {
          return;
        }

        const response = await fetch(`/api/companies/${expandedCompanyId}/join-requests/count`);
        if (response.ok) {
          const data = await response.json();
          setJoinRequestCounts(prev => ({
            ...prev,
            [expandedCompanyId]: data.count
          }));
        }
      } catch (error) {
        console.error('가입 신청 개수 조회 중 오류:', error);
      }
    };

    if (expandedCompanyId) {
      fetchJoinRequestCounts();
    }
  }, [expandedCompanyId, companies]);

  // 페이지 경로 변경 감지하여 확장된 회사 ID 업데이트
  useEffect(() => {
    // URL에서 회사 ID 추출
    const companyIdFromUrl = pathname.startsWith('/companies/') ? pathname.split('/')[2] : null;
    
    // URL의 회사 ID가 유효하면 항상 해당 회사의 아코디언을 펼침
    if (companyIdFromUrl) {
      setExpandedCompanyId(companyIdFromUrl);
    }
  }, [pathname]);

  // 회사 탭 페이지로 이동하는 함수
  const navigateToTab = useCallback((url: string) => {
    // 포인터 이벤트 문제 방지를 위한 처리
    if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
    
    // 이동 중임을 표시하여 UI 업데이트
    setNavigationInProgress(url);
    
    // URL에서 회사 ID 추출
    const companyIdFromUrl = url.startsWith('/companies/') ? url.split('/')[2] : null;
    
    // 회사 ID가 있으면 확장 상태 업데이트
    if (companyIdFromUrl) {
      setExpandedCompanyId(companyIdFromUrl);
    }
    
    // 페이지 이동
    router.push(url);
    
    // 약간의 지연 후 내비게이션 상태 초기화
    setTimeout(() => {
      setNavigationInProgress(null);
    }, 300);
  }, [router]);

  const toggleCompany = (companyId: string) => {
    // 현재 회사가 확장된 상태면 닫고, 아니면 펼침
    setExpandedCompanyId(expandedCompanyId === companyId ? null : companyId);
  };

  // 이미 로드된 기능 정보를 사용하여 빠른 체크
  const isFeatureEnabled = (companyId: string, featureName: CompanyFeature) => {
    const company = companies.find(c => c.id === companyId);
    if (!company || !company.features) return false;
    
    return company.features.some(feature => 
      feature.feature_name === featureName && feature.is_enabled
    );
  };

  return {
    expandedCompanyId,
    joinRequestCounts,
    currentCompanyId,
    userCanCreateCompany,
    navigationInProgress,
    toggleCompany,
    isFeatureEnabled,
    navigateToTab
  };
} 