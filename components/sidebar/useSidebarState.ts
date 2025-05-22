import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Company } from '@/lib/types';
import { CompanyFeature } from './types';

export function useSidebarState(companies: Array<Company & { role: string }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(
    // 현재 URL에서 회사 ID 추출
    pathname.startsWith('/companies/') ? pathname.split('/')[2] : null
  );
  const [joinRequestCounts, setJoinRequestCounts] = useState<Record<string, number>>({});
  const [companyFeatures, setCompanyFeatures] = useState<Record<string, string[]>>({});
  const [preloadedCompanies, setPreloadedCompanies] = useState<Record<string, boolean>>({});
  const [navigationInProgress, setNavigationInProgress] = useState<string | null>(null);

  // 사용자 권한 확인 (회사 생성 권한 체크)
  const userRole = user?.publicMetadata?.role as string;
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  
  // 현재 선택된 회사 ID 확인
  const currentCompanyId = pathname.startsWith('/companies/') ? pathname.split('/')[2] : null;

  // 가입 신청 개수 가져오기
  useEffect(() => {
    const fetchJoinRequestCounts = async () => {
      try {
        // 소유자나 관리자인 회사만 필터링
        const adminCompanies = companies.filter(
          company => company.role === 'owner' || company.role === 'admin'
        );

        if (adminCompanies.length === 0) return;

        const result: Record<string, number> = {};
        
        for (const company of adminCompanies) {
          const response = await fetch(`/api/companies/${company.id}/join-requests/count`);
          if (response.ok) {
            const data = await response.json();
            result[company.id] = data.count;
          }
        }
        
        setJoinRequestCounts(result);
      } catch (error) {
        console.error('가입 신청 개수 조회 중 오류:', error);
      }
    };

    if (expandedCompanyId) {
      fetchJoinRequestCounts();
    }
  }, [expandedCompanyId, companies]);

  // 회사 추가/삭제 이벤트 감지
  useEffect(() => {
    // 회사 변경 이벤트 핸들러
    const handleCompanyChange = (event: StorageEvent) => {
      if (event.key === 'company-change') {
        // URL에서 변경된 부분 확인하고 페이지 새로고침 없이 상태 업데이트
        console.log('회사 정보 변경 감지');
        
        // 회사 변경 시 페이지 새로고침 (임시 방법)
        window.location.reload();
      }
    };
    
    // 커스텀 이벤트 핸들러
    const handleCustomCompanyChange = (event: CustomEvent) => {
      console.log('커스텀 회사 변경 이벤트 감지:', event.detail);
      
      // 변경된 회사 정보 처리
      if (event.detail?.type === 'add' || event.detail?.type === 'delete') {
        // 페이지 새로고침
        window.location.reload();
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('storage', handleCompanyChange);
    window.addEventListener('company-change', handleCustomCompanyChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleCompanyChange);
      window.removeEventListener('company-change', handleCustomCompanyChange as EventListener);
    };
  }, []);

  // 회사의 활성화된 기능 가져오기
  const fetchCompanyFeatures = useCallback(async (companyId: string) => {
    if (!companyId) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/features`);
      if (response.ok) {
        const data = await response.json();
        
        console.log(`회사 ID ${companyId}의 기능 목록:`, data);
        
        // 중요 기능 누락 여부 확인
        const hasIngredientsFeature = data.some((feature: any) => feature.feature_name === 'ingredients');
        const hasMenusFeature = data.some((feature: any) => feature.feature_name === 'menus');
        const hasMealPlanningFeature = data.some((feature: any) => feature.feature_name === 'mealPlanning');
        const hasCookingPlanFeature = data.some((feature: any) => feature.feature_name === 'cookingPlan');
        const hasInventoryFeature = data.some((feature: any) => feature.feature_name === 'inventory');
        
        if (!hasIngredientsFeature) {
          console.warn(`회사 ID ${companyId}에 ingredients 기능이 누락되어 있습니다.`);
        }
        
        if (!hasMenusFeature) {
          console.warn(`회사 ID ${companyId}에 menus 기능이 누락되어 있습니다.`);
        }
        
        if (!hasMealPlanningFeature) {
          console.warn(`회사 ID ${companyId}에 mealPlanning 기능이 누락되어 있습니다.`);
          
          // mealPlanning 기능이 누락된 경우 자동 추가 시도
          try {
            console.log('mealPlanning 기능 자동 추가 시도');
            await fetch(`/api/companies/${companyId}/features`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                featureName: 'mealPlanning',
                isEnabled: true
              })
            });
            
            // 성공 시 다시 기능 목록 불러오기
            const refreshResponse = await fetch(`/api/companies/${companyId}/features`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const enabledFeatures = refreshData
                .filter((feature: any) => feature.is_enabled)
                .map((feature: any) => feature.feature_name);
              
              setCompanyFeatures(prev => ({
                ...prev,
                [companyId]: enabledFeatures
              }));
              return; // 재호출했으므로 여기서 종료
            }
          } catch (error) {
            console.error('mealPlanning 기능 자동 추가 실패:', error);
          }
        }
        
        if (!hasCookingPlanFeature) {
          console.warn(`회사 ID ${companyId}에 cookingPlan 기능이 누락되어 있습니다.`);
          
          // cookingPlan 기능이 누락된 경우 자동 추가 시도
          try {
            console.log('cookingPlan 기능 자동 추가 시도');
            await fetch(`/api/companies/${companyId}/features`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                featureName: 'cookingPlan',
                isEnabled: true
              })
            });
            
            // 성공 시 다시 기능 목록 불러오기
            const refreshResponse = await fetch(`/api/companies/${companyId}/features`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const enabledFeatures = refreshData
                .filter((feature: any) => feature.is_enabled)
                .map((feature: any) => feature.feature_name);
              
              setCompanyFeatures(prev => ({
                ...prev,
                [companyId]: enabledFeatures
              }));
              return; // 재호출했으므로 여기서 종료
            }
          } catch (error) {
            console.error('cookingPlan 기능 자동 추가 실패:', error);
          }
        }
        
        if (!hasInventoryFeature) {
          console.warn(`회사 ID ${companyId}에 inventory 기능이 누락되어 있습니다.`);
          
          // inventory 기능이 누락된 경우 자동 추가 시도
          try {
            console.log('inventory 기능 자동 추가 시도');
            await fetch(`/api/companies/${companyId}/features`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                featureName: 'inventory',
                isEnabled: true
              })
            });
            
            // 성공 시 다시 기능 목록 불러오기
            const refreshResponse = await fetch(`/api/companies/${companyId}/features`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const enabledFeatures = refreshData
                .filter((feature: any) => feature.is_enabled)
                .map((feature: any) => feature.feature_name);
              
              setCompanyFeatures(prev => ({
                ...prev,
                [companyId]: enabledFeatures
              }));
              return; // 재호출했으므로 여기서 종료
            }
          } catch (error) {
            console.error('inventory 기능 자동 추가 실패:', error);
          }
        }
        
        // 활성화된 기능들만 필터링
        const enabledFeatures = data
          .filter((feature: any) => feature.is_enabled)
          .map((feature: any) => feature.feature_name);
        
        console.log(`회사 ID ${companyId}의 활성화된 기능:`, enabledFeatures);
        
        setCompanyFeatures(prev => ({
          ...prev,
          [companyId]: enabledFeatures
        }));
      } else {
        // 응답이 실패한 경우 상세 오류 정보 출력
        const errorText = await response.text();
        console.error(`회사 ID ${companyId}의 기능 조회 실패:`, 
          response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error(`회사 ID ${companyId}의 기능 조회 중 오류:`, error);
    }
  }, []);

  // 회사 데이터 미리 가져오기
  const preloadCompanyData = useCallback(async (companyId: string) => {
    // 이미 미리 로드된 회사인지 확인
    if (preloadedCompanies[companyId]) return;
    
    try {
      // 회사 기능 미리 가져오기
      await fetchCompanyFeatures(companyId);
      
      // 기본 페이지 미리 가져오기
      await fetch(`/companies/${companyId}`);
      
      // 멤버 페이지 미리 가져오기
      await fetch(`/companies/${companyId}/members`);
      
      // 미리 로드 완료 표시
      setPreloadedCompanies(prev => ({
        ...prev,
        [companyId]: true
      }));
    } catch (error) {
      console.error(`회사 ID ${companyId} 데이터 미리 가져오기 오류:`, error);
    }
  }, [fetchCompanyFeatures, preloadedCompanies]);

  // 회사를 확장할 때 기능 가져오기 및 데이터 미리 로드
  useEffect(() => {
    if (expandedCompanyId) {
      fetchCompanyFeatures(expandedCompanyId);
      
      // 다른 회사 데이터도 백그라운드에서 미리 가져오기
      if (companies.length > 0) {
        const otherCompanies = companies
          .filter(company => company.id !== expandedCompanyId)
          .map(company => company.id);
        
        // 처음 5개 회사만 데이터 미리 가져오기
        otherCompanies.slice(0, 5).forEach(companyId => {
          setTimeout(() => {
            preloadCompanyData(companyId);
          }, 2000); // 2초 후에 미리 가져오기 시작
        });
      }
    }

    // 기능 변경 이벤트 감지
    const handleFeatureChange = () => {
      const featureChangeStr = localStorage.getItem('feature-change');
      if (!featureChangeStr) return;
      
      try {
        const featureChange = JSON.parse(featureChangeStr);
        // 현재 확장된 회사의 기능이 변경된 경우에만 업데이트
        if (featureChange.companyId === expandedCompanyId && expandedCompanyId) {
          fetchCompanyFeatures(expandedCompanyId);
        }
      } catch (error) {
        console.error('기능 변경 이벤트 처리 중 오류:', error);
      }
    };
    
    // 커스텀 이벤트 핸들러
    const handleCustomFeatureChange = (event: any) => {
      const featureChange = event.detail;
      if (featureChange && featureChange.companyId === expandedCompanyId && expandedCompanyId) {
        console.log('커스텀 이벤트 수신:', featureChange);
        fetchCompanyFeatures(expandedCompanyId);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('storage', handleFeatureChange);
    window.addEventListener('feature-change', handleCustomFeatureChange);
    
    return () => {
      window.removeEventListener('storage', handleFeatureChange);
      window.removeEventListener('feature-change', handleCustomFeatureChange);
    };
  }, [expandedCompanyId, companies, fetchCompanyFeatures, preloadCompanyData]);

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
    
    // 닫혀있던 회사를 펼칠 때만 기능 로드 및 데이터 미리 가져오기
    if (expandedCompanyId !== companyId) {
      fetchCompanyFeatures(companyId);
      preloadCompanyData(companyId);
    }
  };

  const isFeatureEnabled = (companyId: string, featureName: CompanyFeature) => {
    // 회사의 활성화된 기능 목록 가져오기
    const features = companyFeatures[companyId] || [];
    return features.includes(featureName);
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