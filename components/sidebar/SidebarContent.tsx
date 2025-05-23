import { useUser } from '@clerk/nextjs';
import { CompanySidebarProps, CompanyWithFeatures } from './types';
import { SidebarHeader } from './SidebarHeader';
import { CompanyItem } from './CompanyItem';
import { SidebarActions } from './SidebarActions';
import { useSidebarState } from './useSidebarState';
import { useCallback } from 'react';

export function SidebarContent({ companies, isMobile = false, isSheetOpen, setIsSheetOpen }: CompanySidebarProps) {
  const { user } = useUser();
  const {
    expandedCompanyId,
    joinRequestCounts,
    currentCompanyId,
    userCanCreateCompany,
    navigationInProgress,
    toggleCompany,
    isFeatureEnabled,
    navigateToTab
  } = useSidebarState(companies);

  // 모바일 사이드바 닫기 (링크 클릭 시)
  const handleLinkClick = useCallback(() => {
    if (isMobile && setIsSheetOpen) {
      setIsSheetOpen(false);
    }
  }, [isMobile, setIsSheetOpen]);
  
  // 탭 이동 함수 (모바일 환경에서는 사이드바 닫기 기능 추가)
  const handleNavigateToTab = useCallback((url: string) => {
    // 기본 네비게이션 실행
    navigateToTab(url);
    
    // 모바일 환경에서는 사이드바 닫기
    handleLinkClick();
  }, [navigateToTab, handleLinkClick]);

  return (
    <div className="py-2 text-gray-300 h-full flex flex-col">
      <SidebarHeader 
        user={user} 
        isMobile={isMobile} 
        onClose={() => setIsSheetOpen && setIsSheetOpen(false)}
      />
      
      {/* 회사 목록 */}
      <div className="px-4 mb-3 mt-3">
        <h2 className="text-white font-semibold text-lg mb-2">내 회사</h2>
      </div>
      
      <div className="overflow-y-auto flex-1">
        {companies.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">
            등록된 회사가 없습니다
          </div>
        ) : (
          <ul className="space-y-1">
            {companies.map((company) => {
              const companyWithFeatures: CompanyWithFeatures = {
                ...company,
                isCurrentCompany: company.id === currentCompanyId,
                isExpanded: company.id === expandedCompanyId,
                requestCount: joinRequestCounts[company.id] || 0,
                isAdmin: company.role === 'owner' || company.role === 'admin',
                hasIngredientsFeature: isFeatureEnabled(company.id, 'ingredients'),
                hasMenusFeature: isFeatureEnabled(company.id, 'menus'),
                hasMealPlanningFeature: isFeatureEnabled(company.id, 'mealPlanning'),
                hasCookingPlanFeature: isFeatureEnabled(company.id, 'cookingPlan'),
                hasInventoryFeature: isFeatureEnabled(company.id, 'inventory'),
                navigationInProgress,
                navigateToTab: handleNavigateToTab
              };
              
              return (
                <CompanyItem 
                  key={company.id}
                  company={companyWithFeatures}
                  toggleCompany={toggleCompany}
                  handleLinkClick={handleLinkClick}
                />
              );
            })}
          </ul>
        )}
      </div>
      
      {/* 하단 액션 메뉴 */}
      <SidebarActions 
        userCanCreateCompany={userCanCreateCompany}
        handleLinkClick={handleLinkClick}
      />
    </div>
  );
} 