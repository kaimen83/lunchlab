import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building, ChevronDown, ChevronRight, Users, ClipboardList, Settings, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CompanyWithFeatures } from './types';

interface CompanyItemProps {
  company: CompanyWithFeatures;
  toggleCompany: (companyId: string) => void;
  handleLinkClick: () => void;
}

export function CompanyItem({ company, toggleCompany, handleLinkClick }: CompanyItemProps) {
  const pathname = usePathname();
  const {
    id,
    name,
    isCurrentCompany,
    isExpanded,
    requestCount,
    isAdmin,
    hasIngredientsFeature,
    hasMenusFeature,
    hasMealPlanningFeature
  } = company;
  
  // 디버깅용 로그 추가
  console.log(`회사 ${name}(${id}) 기능 상태:`, {
    ingredients: hasIngredientsFeature,
    menus: hasMenusFeature,
    mealPlanning: hasMealPlanningFeature
  });

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
          <Link 
            href={`/companies/${id}`} 
            className={cn(
              "flex items-center px-2 py-1.5 text-sm rounded",
              pathname === `/companies/${id}` 
                ? "bg-[#1164A3] text-white" 
                : "hover:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <span className="text-gray-400 mr-2">#</span>
            일반
          </Link>
          
          <Link 
            href={isAdmin && requestCount > 0 
              ? `/companies/${id}/members?tab=requests` 
              : `/companies/${id}/members`} 
            className={cn(
              "flex items-center px-2 py-1.5 text-sm rounded",
              pathname.startsWith(`/companies/${id}/members`) || 
              pathname.startsWith(`/companies/${id}/join-requests`)
                ? "bg-[#1164A3] text-white" 
                : "hover:bg-gray-700"
            )}
            onClick={handleLinkClick}
          >
            <Users className="h-3.5 w-3.5 mr-2 text-gray-400" />
            <span>멤버</span>
            {isAdmin && requestCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs bg-red-500 px-1.5 py-0.5 h-4 min-w-4 flex items-center justify-center">
                {requestCount}
              </Badge>
            )}
          </Link>
          
          {/* 식자재/메뉴 관리 메뉴 - 모든 회원에게 표시 */}
          {(hasIngredientsFeature || hasMenusFeature) && (
            <Link 
              href={`/companies/${id}/inventory`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded",
                pathname === `/companies/${id}/inventory` ||
                pathname.startsWith(`/companies/${id}/ingredients`) ||
                pathname.startsWith(`/companies/${id}/menus`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={handleLinkClick}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>식자재/메뉴</span>
            </Link>
          )}
          
          {/* 식단 관리 메뉴 - 모든 회원에게 표시 */}
          {hasMealPlanningFeature && (
            <Link 
              href={`/companies/${id}/meal-plans`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded",
                pathname === `/companies/${id}/meal-plans` ||
                pathname.startsWith(`/companies/${id}/meal-plans`)
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={handleLinkClick}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>식단 관리</span>
            </Link>
          )}
          
          {/* 회사 설정 메뉴 - 관리자만 접근 가능 */}
          {isAdmin && (
            <Link 
              href={`/companies/${id}/settings`} 
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded",
                pathname.startsWith(`/companies/${id}/settings`) 
                  ? "bg-[#1164A3] text-white" 
                  : "hover:bg-gray-700"
              )}
              onClick={handleLinkClick}
            >
              <Settings className="h-3.5 w-3.5 mr-2 text-gray-400" />
              <span>설정</span>
            </Link>
          )}
        </div>
      )}
    </li>
  );
} 