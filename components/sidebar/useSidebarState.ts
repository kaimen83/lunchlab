import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Company } from '@/lib/types';
import { CompanyFeature } from './types';

export function useSidebarState(companies: Array<Company & { role: string }>) {
  const pathname = usePathname();
  const { user } = useUser();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(
    // 현재 URL에서 회사 ID 추출
    pathname.startsWith('/companies/') ? pathname.split('/')[2] : null
  );
  const [joinRequestCounts, setJoinRequestCounts] = useState<Record<string, number>>({});
  const [companyFeatures, setCompanyFeatures] = useState<Record<string, string[]>>({});

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
  useEffect(() => {
    const fetchCompanyFeatures = async () => {
      if (!expandedCompanyId) return;
      
      try {
        const response = await fetch(`/api/companies/${expandedCompanyId}/features`);
        if (response.ok) {
          const data = await response.json();
          
          console.log(`회사 ID ${expandedCompanyId}의 기능 목록:`, data);
          
          // 중요 기능 누락 여부 확인
          const hasIngredientsFeature = data.some((feature: any) => feature.feature_name === 'ingredients');
          const hasMenusFeature = data.some((feature: any) => feature.feature_name === 'menus');
          const hasMealPlanningFeature = data.some((feature: any) => feature.feature_name === 'mealPlanning');
          
          if (!hasIngredientsFeature) {
            console.warn(`회사 ID ${expandedCompanyId}에 ingredients 기능이 누락되어 있습니다.`);
          }
          
          if (!hasMenusFeature) {
            console.warn(`회사 ID ${expandedCompanyId}에 menus 기능이 누락되어 있습니다.`);
          }
          
          if (!hasMealPlanningFeature) {
            console.warn(`회사 ID ${expandedCompanyId}에 mealPlanning 기능이 누락되어 있습니다.`);
            
            // mealPlanning 기능이 누락된 경우 자동 추가 시도
            try {
              console.log('mealPlanning 기능 자동 추가 시도');
              await fetch(`/api/companies/${expandedCompanyId}/features`, {
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
              const refreshResponse = await fetch(`/api/companies/${expandedCompanyId}/features`);
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const enabledFeatures = refreshData
                  .filter((feature: any) => feature.is_enabled)
                  .map((feature: any) => feature.feature_name);
                
                setCompanyFeatures(prev => ({
                  ...prev,
                  [expandedCompanyId]: enabledFeatures
                }));
                return; // 재호출했으므로 여기서 종료
              }
            } catch (error) {
              console.error('mealPlanning 기능 자동 추가 실패:', error);
            }
          }
          
          // 활성화된 기능들만 필터링
          const enabledFeatures = data
            .filter((feature: any) => feature.is_enabled)
            .map((feature: any) => feature.feature_name);
          
          console.log(`회사 ID ${expandedCompanyId}의 활성화된 기능:`, enabledFeatures);
          
          setCompanyFeatures(prev => ({
            ...prev,
            [expandedCompanyId]: enabledFeatures
          }));
        } else {
          // 응답이 실패한 경우 상세 오류 정보 출력
          const errorText = await response.text();
          console.error(`회사 ID ${expandedCompanyId}의 기능 조회 실패:`, 
            response.status, response.statusText, errorText);
        }
      } catch (error) {
        console.error(`회사 ID ${expandedCompanyId}의 기능 조회 중 오류:`, error);
      }
    };
    
    if (expandedCompanyId) {
      fetchCompanyFeatures();
    }

    // 기능 변경 이벤트 감지
    const handleFeatureChange = () => {
      const featureChangeStr = localStorage.getItem('feature-change');
      if (!featureChangeStr) return;
      
      try {
        const featureChange = JSON.parse(featureChangeStr);
        // 현재 확장된 회사의 기능이 변경된 경우에만 업데이트
        if (featureChange.companyId === expandedCompanyId) {
          fetchCompanyFeatures();
        }
      } catch (error) {
        console.error('기능 변경 이벤트 처리 중 오류:', error);
      }
    };
    
    // 커스텀 이벤트 핸들러
    const handleCustomFeatureChange = (event: any) => {
      const featureChange = event.detail;
      if (featureChange && featureChange.companyId === expandedCompanyId) {
        console.log('커스텀 이벤트 수신:', featureChange);
        fetchCompanyFeatures();
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('storage', handleFeatureChange);
    window.addEventListener('feature-change', handleCustomFeatureChange);
    
    return () => {
      window.removeEventListener('storage', handleFeatureChange);
      window.removeEventListener('feature-change', handleCustomFeatureChange);
    };
  }, [expandedCompanyId]);

  const toggleCompany = (companyId: string) => {
    setExpandedCompanyId(expandedCompanyId === companyId ? null : companyId);
  };

  // 회사에 특정 기능이 활성화되어 있는지 확인
  const isFeatureEnabled = (companyId: string, featureName: CompanyFeature) => {
    // 기본 제공 기능인 경우 항상 true 반환
    if (featureName === 'settings') return true;
    
    // mealPlanning 기능은 누락되었어도 기본적으로 표시
    if (featureName === 'mealPlanning') {
      // companyFeatures에 해당 회사의 기능이 정의되어 있지 않거나
      // mealPlanning이 정의되지 않은 경우 true 반환 (기본 활성화)
      if (!companyFeatures[companyId]) {
        console.log(`${companyId} 회사의 기능 정보가 아직 로드되지 않았습니다. ${featureName} 기능 임시 활성화`);
        return true;
      }
    }
    
    // 일반적인 경우 기능 활성화 여부 확인
    return companyFeatures[companyId]?.includes(featureName) || false;
  };

  return {
    expandedCompanyId,
    joinRequestCounts,
    companyFeatures,
    currentCompanyId,
    userCanCreateCompany,
    toggleCompany,
    isFeatureEnabled
  };
} 