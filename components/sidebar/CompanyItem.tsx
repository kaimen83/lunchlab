import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building, ChevronDown, ChevronRight, Users, ClipboardList, Settings, CalendarDays, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CompanyWithFeatures } from './types';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyItemProps {
  company: CompanyWithFeatures;
  toggleCompany: (companyId: string) => void;
  handleLinkClick: () => void;
}

export function CompanyItem({ company, toggleCompany, handleLinkClick }: CompanyItemProps) {
  const pathname = usePathname();
  // 현재 URL에서 회사 ID 추출
  const currentCompanyIdInUrl = pathname.startsWith('/companies/') ? pathname.split('/')[2] : null;
  
  // activeTab 초기화 - 현재 보고 있는 회사가 이 회사인 경우에만 설정
  const [activeTab, setActiveTab] = useState<string | null>(
    currentCompanyIdInUrl === company.id ? pathname : null
  );
  
  const {
    id,
    name,
    isCurrentCompany,
    isExpanded,
    requestCount,
    isAdmin,
    hasIngredientsFeature,
    hasMenusFeature,
    hasMealPlanningFeature,
    hasCookingPlanFeature,
    navigationInProgress
  } = company;
  
  // 낙관적 UI 업데이트를 위한 함수
  const handleTabClick = (url: string, event: React.MouseEvent) => {
    event.preventDefault(); // 기본 링크 동작 방지
    
    // 이미 활성화된 탭이면 무시
    if (url === activeTab) {
      handleLinkClick();
      return;
    }
    
    // 낙관적 UI 업데이트: 클릭한 탭을 즉시 활성화
    setActiveTab(url);
    
    // 내비게이션 기능 호출
    if (company.navigateToTab) {
      company.navigateToTab(url);
    }
    
    handleLinkClick();
  };
  
  // 각 탭이 활성화 되었는지 확인하는 함수
  const isTabActive = (url: string) => {
    // 현재 URL의 회사 ID가 이 회사가 아니면 항상 false 반환
    if (currentCompanyIdInUrl !== company.id) {
      return false;
    }
    
    // 낙관적 UI 적용: 현재 활성화 탭이 있으면 그것을 우선 사용
    if (activeTab) {
      return activeTab === url || activeTab.startsWith(url);
    }
    // 아니면 실제 경로 확인
    return pathname === url || pathname.startsWith(url);
  };
  
  // 디버깅용 로그 추가

  return (
    <li className="px-2">
      {/* 회사 항목 */}
      <div className="mb-1">
        <div 
          className={cn(
            "flex items-center px-2 py-1.5 rounded cursor-pointer",
            isCurrentCompany ? "bg-[#1164A3] text-white" : "hover:bg-gray-700"
          )}
          onClick={() => toggleCompany(id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
          )}
          
          <div className="bg-blue-600 w-5 h-5 rounded flex items-center justify-center mr-2 flex-shrink-0">
            <Building className="h-3 w-3 text-white" />
          </div>
          
          <span className="truncate flex-1">{name}</span>
        </div>
      </div>
      
      {/* 확장된 회사일 경우 하위 메뉴 표시 */}
      {isExpanded && (
        <div className="pl-7 space-y-0.5 mb-2">
          <a 
            href={`/companies/${id}`} 
            className={cn(
              "flex items-center px-2 py-1.5 text-sm rounded relative",
              isTabActive(`/companies/${id}`) && !pathname.includes('/members') && !pathname.includes('/inventory') 
                && !pathname.includes('/meal-plans') && !pathname.includes('/cooking-plans') && !pathname.includes('/settings')
                ? "bg-[#1164A3] text-white" 
                : "hover:bg-gray-700"
            )}
            onClick={(e) => handleTabClick(`/companies/${id}`, e)}
          >
            <span className="text-gray-400 mr-2">#</span>
            일반
            {/* 로딩 인디케이터 */}
            {navigationInProgress === `/companies/${id}` && (
              <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
            )}
          </a>
          
          <a 
            href={isAdmin && requestCount > 0 
              ? `/companies/${id}/members?tab=requests` 
              : `/companies/${id}/members`} 
            className={cn(
              "flex items-center px-2 py-1.5 text-sm rounded relative",
              isTabActive(`/companies/${id}/members`) || isTabActive(`/companies/${id}/join-requests`)
                ? "bg-[#1164A3] text-white" 
                : "hover:bg-gray-700"
            )}
            onClick={(e) => handleTabClick(isAdmin && requestCount > 0 
              ? `/companies/${id}/members?tab=requests` 
              : `/companies/${id}/members`, e)}
          >
            <Users className="h-3.5 w-3.5 mr-2 text-gray-400" />
            <span>멤버</span>
            {isAdmin && requestCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs bg-red-500 px-1.5 py-0.5 h-4 min-w-4 flex items-center justify-center">
                {requestCount}
              </Badge>
            )}
            {/* 로딩 인디케이터 */}
            {(navigationInProgress === `/companies/${id}/members` || navigationInProgress === `/companies/${id}/members?tab=requests`) && (
              <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
            )}
          </a>
          
          {/* 식자재/메뉴 관리 메뉴 - 모든 회원에게 표시 */}
          {(hasIngredientsFeature || hasMenusFeature) && (
            <a 
              href={`/companies/${id}/inventory`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded relative",
                isTabActive(`/companies/${id}/inventory`) || isTabActive(`/companies/${id}/ingredients`) || isTabActive(`/companies/${id}/menus`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={(e) => handleTabClick(`/companies/${id}/inventory`, e)}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>식자재/메뉴</span>
              {/* 로딩 인디케이터 */}
              {navigationInProgress === `/companies/${id}/inventory` && (
                <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              )}
            </a>
          )}
          
          {/* 식단 관리 메뉴 - 모든 회원에게 표시 */}
          {hasMealPlanningFeature && (
            <a 
              href={`/companies/${id}/meal-plans`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded relative",
                isTabActive(`/companies/${id}/meal-plans`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={(e) => handleTabClick(`/companies/${id}/meal-plans`, e)}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>식단 관리</span>
              {/* 로딩 인디케이터 */}
              {navigationInProgress === `/companies/${id}/meal-plans` && (
                <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              )}
            </a>
          )}
          
          {/* 조리계획서 메뉴 - 모든 회원에게 표시 */}
          {hasCookingPlanFeature && (
            <a 
              href={`/companies/${id}/cooking-plans`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded relative",
                isTabActive(`/companies/${id}/cooking-plans`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={(e) => handleTabClick(`/companies/${id}/cooking-plans`, e)}
            >
              <FileText className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>조리계획서</span>
              {/* 로딩 인디케이터 */}
              {navigationInProgress === `/companies/${id}/cooking-plans` && (
                <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              )}
            </a>
          )}
          
          {/* 회사 설정 메뉴 - 관리자만 접근 가능 */}
          {isAdmin && (
            <a 
              href={`/companies/${id}/settings`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded relative",
                isTabActive(`/companies/${id}/settings`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={(e) => handleTabClick(`/companies/${id}/settings`, e)}
            >
              <Settings className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>설정</span>
              {/* 로딩 인디케이터 */}
              {navigationInProgress === `/companies/${id}/settings` && (
                <div className="absolute right-2 w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
              )}
            </a>
          )}
        </div>
      )}
    </li>
  );
} 