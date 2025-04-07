'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Building, Plus, Users, Settings, PackageOpen } from 'lucide-react';
import { Company, MarketplaceModule, ModuleMenuItem as ModuleMenuItemType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ModuleMenuGroup } from './ModuleMenuGroup';
import { ModuleMenuItem } from './ModuleMenuItem';
import { Badge } from '@/components/ui/badge';

// 아이콘 매핑 객체
const ICON_MAP: Record<string, any> = {
  'users': Users,
  'settings': Settings,
  'package': PackageOpen,
};

interface DynamicSidebarProps {
  companies: Array<Company & { role: string }>;
  companyModules?: {
    [companyId: string]: (MarketplaceModule & { 
      menuItems: ModuleMenuItemType[];
    })[];
  };
}

export function DynamicSidebar({ companies, companyModules = {} }: DynamicSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(
    // 현재 URL에서 회사 ID 추출
    pathname.startsWith('/companies/') ? pathname.split('/')[2] : null
  );
  const [joinRequestCounts, setJoinRequestCounts] = useState<Record<string, number>>({});

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

  const toggleCompany = (companyId: string) => {
    setExpandedCompanyId(expandedCompanyId === companyId ? null : companyId);
  };

  return (
    <div className="py-4 text-gray-300 h-full flex flex-col">
      <div className="px-4 mb-6">
        <h2 className="text-white font-semibold text-lg mb-2">내 회사</h2>
        
        {/* 회사 생성 버튼 */}
        {userCanCreateCompany && (
          <Link 
            href="/companies/new" 
            className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 회사 추가
          </Link>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1">
        {companies.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">
            등록된 회사가 없습니다
          </div>
        ) : (
          <ul className="space-y-1">
            {companies.map((company) => {
              const isCurrentCompany = company.id === currentCompanyId;
              const isExpanded = company.id === expandedCompanyId;
              const requestCount = joinRequestCounts[company.id] || 0;
              const isAdmin = company.role === 'owner' || company.role === 'admin';
              // 현재 회사의 모듈 가져오기
              const modules = companyModules[company.id] || [];
              
              return (
                <ModuleMenuGroup
                  key={company.id}
                  title={company.name}
                  icon={Building}
                  defaultExpanded={isExpanded || isCurrentCompany}
                >
                  {/* 기본 메뉴 아이템 */}
                  <ModuleMenuItem
                    label="일반"
                    path={`/companies/${company.id}`}
                    companyId={company.id}
                    isActive={pathname === `/companies/${company.id}`}
                    companyPath={false}
                  />
                  
                  <ModuleMenuItem
                    label="멤버"
                    icon={Users}
                    path={isAdmin && requestCount > 0 
                      ? `/companies/${company.id}/members?tab=requests` 
                      : `/companies/${company.id}/members`}
                    companyId={company.id}
                    isActive={pathname.startsWith(`/companies/${company.id}/members`) || 
                              pathname.startsWith(`/companies/${company.id}/join-requests`)}
                    companyPath={false}
                  />
                  
                  {isAdmin && (
                    <ModuleMenuItem
                      label="설정"
                      icon={Settings}
                      path={`/companies/${company.id}/settings`}
                      companyId={company.id}
                      isActive={pathname === `/companies/${company.id}/settings`}
                      companyPath={false}
                    />
                  )}
                  
                  {/* 모듈별 메뉴 아이템 */}
                  {modules.map(module => (
                    <div key={module.id} className="mt-2">
                      <div className="text-xs text-gray-400 px-2 py-1">{module.name}</div>
                      {module.menuItems.map(menuItem => {
                        const IconComponent = menuItem.icon ? ICON_MAP[menuItem.icon] : undefined;
                        return (
                          <ModuleMenuItem
                            key={menuItem.id}
                            label={menuItem.label}
                            icon={IconComponent}
                            path={menuItem.path}
                            companyId={company.id}
                            isActive={pathname === `/companies/${company.id}${menuItem.path}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </ModuleMenuGroup>
              );
            })}
          </ul>
        )}
      </div>
      
      <div className="mt-auto px-4 py-3 border-t border-gray-700">
        <div className="flex items-center text-sm">
          <div className="bg-white w-7 h-7 rounded-sm flex items-center justify-center mr-2 overflow-hidden">
            {user?.imageUrl ? (
              <Image 
                src={user.imageUrl} 
                alt={user?.username || '사용자'} 
                width={28}
                height={28}
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="text-gray-800 font-bold">{user?.username?.charAt(0) || '?'}</span>
            )}
          </div>
          <span className="truncate">{user?.username || user?.firstName || '사용자'}</span>
        </div>
      </div>
    </div>
  );
} 