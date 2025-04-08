'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Building, Plus, Users, Settings, ChevronDown, ChevronRight, BookOpen, ClipboardList, Search, Mail, LogOut } from 'lucide-react';
import { Company } from '@/lib/types';
import { useUser, UserButton } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CompanySidebarProps {
  companies: Array<Company & { role: string }>;
}

export function CompanySidebar({ companies }: CompanySidebarProps) {
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
          
          if (!hasIngredientsFeature) {
            console.warn(`회사 ID ${expandedCompanyId}에 ingredients 기능이 누락되어 있습니다.`);
          }
          
          if (!hasMenusFeature) {
            console.warn(`회사 ID ${expandedCompanyId}에 menus 기능이 누락되어 있습니다.`);
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

    // storage 이벤트 리스너 등록
    window.addEventListener('storage', handleFeatureChange);
    
    return () => {
      window.removeEventListener('storage', handleFeatureChange);
    };
  }, [expandedCompanyId]);

  const toggleCompany = (companyId: string) => {
    setExpandedCompanyId(expandedCompanyId === companyId ? null : companyId);
  };

  // 회사에 특정 기능이 활성화되어 있는지 확인
  const isFeatureEnabled = (companyId: string, featureName: string) => {
    return companyFeatures[companyId]?.includes(featureName) || false;
  };

  return (
    <div className="py-2 text-gray-300 h-full flex flex-col">
      {/* 앱 로고 및 사용자 프로필 */}
      <div className="px-4 py-3">
        <Link href="/" className="text-white font-bold text-xl flex items-center">
          LunchLab
        </Link>
      </div>
      
      {/* 사용자 프로필 */}
      <div className="px-4 py-2 flex items-center">
        <UserButton afterSignOutUrl="/sign-in" />
        <div className="ml-2 overflow-hidden">
          <p className="text-white text-sm truncate">
            {user?.fullName || '사용자'}
          </p>
          <p className="text-gray-400 text-xs truncate">
            {user?.primaryEmailAddress?.emailAddress || ''}
          </p>
        </div>
      </div>
      
      <Separator className="my-2 bg-gray-700"/>
      
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
              const isCurrentCompany = company.id === currentCompanyId;
              const isExpanded = company.id === expandedCompanyId;
              const requestCount = joinRequestCounts[company.id] || 0;
              const isAdmin = company.role === 'owner' || company.role === 'admin';
              const hasIngredientsFeature = isFeatureEnabled(company.id, 'ingredients');
              const hasMenusFeature = isFeatureEnabled(company.id, 'menus');
              
              return (
                <li key={company.id} className="px-2">
                  {/* 회사 항목 */}
                  <div className="mb-1">
                    <div 
                      className={cn(
                        "flex items-center px-2 py-1.5 rounded cursor-pointer",
                        isCurrentCompany ? "bg-[#1164A3] text-white" : "hover:bg-gray-700"
                      )}
                      onClick={() => toggleCompany(company.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      )}
                      
                      <div className="bg-blue-600 w-5 h-5 rounded flex items-center justify-center mr-2 flex-shrink-0">
                        <Building className="h-3 w-3 text-white" />
                      </div>
                      
                      <span className="truncate flex-1">{company.name}</span>
                    </div>
                  </div>
                  
                  {/* 확장된 회사일 경우 하위 메뉴 표시 */}
                  {isExpanded && (
                    <div className="pl-7 space-y-0.5 mb-2">
                      <Link 
                        href={`/companies/${company.id}`} 
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded",
                          pathname === `/companies/${company.id}` 
                            ? "bg-[#1164A3] text-white" 
                            : "hover:bg-gray-700"
                        )}
                      >
                        <span className="text-gray-400 mr-2">#</span>
                        일반
                      </Link>
                      
                      <Link 
                        href={isAdmin && requestCount > 0 
                          ? `/companies/${company.id}/members?tab=requests` 
                          : `/companies/${company.id}/members`} 
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded",
                          pathname.startsWith(`/companies/${company.id}/members`) || 
                          pathname.startsWith(`/companies/${company.id}/join-requests`)
                            ? "bg-[#1164A3] text-white" 
                            : "hover:bg-gray-700"
                        )}
                      >
                        <Users className="h-3.5 w-3.5 mr-2 text-gray-400" />
                        <span>멤버</span>
                        {isAdmin && requestCount > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs bg-red-500 px-1.5 py-0.5 h-4 min-w-4 flex items-center justify-center">
                            {requestCount}
                          </Badge>
                        )}
                      </Link>
                      
                      {/* 식자재/메뉴 관리 메뉴 - 식재료 또는 메뉴 기능이 활성화된 경우 표시 */}
                      {(hasIngredientsFeature || hasMenusFeature) && (
                        <Link 
                          href={`/companies/${company.id}/inventory`} 
                          className={cn(
                            "flex items-center px-2 py-1.5 text-sm rounded",
                            pathname === `/companies/${company.id}/inventory` ||
                            pathname === `/companies/${company.id}/ingredients` ||
                            pathname === `/companies/${company.id}/menus`
                              ? "bg-[#1164A3] text-white" 
                              : "hover:bg-gray-700"
                          )}
                        >
                          <ClipboardList className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>식자재/메뉴</span>
                        </Link>
                      )}
                      
                      {/* 회사 설정 메뉴 */}
                      {isAdmin && (
                        <Link 
                          href={`/companies/${company.id}/settings`} 
                          className={cn(
                            "flex items-center px-2 py-1.5 text-sm rounded",
                            pathname.startsWith(`/companies/${company.id}/settings`) 
                              ? "bg-[#1164A3] text-white" 
                              : "hover:bg-gray-700"
                          )}
                        >
                          <Settings className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          <span>설정</span>
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      
      {/* 하단 액션 메뉴 */}
      <div className="mt-auto px-2 pb-4">
        <Separator className="my-3 bg-gray-700"/>
        
        {/* 회사 생성 버튼 */}
        {userCanCreateCompany && (
          <Link 
            href="/companies/new" 
            className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mb-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            새 회사 추가
          </Link>
        )}
        
        {/* 초대 관리 버튼 */}
        <Link 
          href="/invitations" 
          className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mb-2"
        >
          <Mail className="h-4 w-4 mr-2" />
          초대 관리
        </Link>
        
        {/* 회사 검색 버튼 */}
        <Link 
          href="/companies/search" 
          className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150"
        >
          <Search className="h-4 w-4 mr-2" />
          회사 검색
        </Link>
        
        {/* 홈으로 돌아가기 */}
        <Link 
          href="/" 
          className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mt-2"
        >
          <LogOut className="h-4 w-4 mr-2" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
} 