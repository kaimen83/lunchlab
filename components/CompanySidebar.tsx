'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building, Plus, Users, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { Company } from '@/lib/types';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

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

  // 사용자 권한 확인 (회사 생성 권한 체크)
  const userRole = user?.publicMetadata?.role as string;
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  
  // 현재 선택된 회사 ID 확인
  const currentCompanyId = pathname.startsWith('/companies/') ? pathname.split('/')[2] : null;

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
                        href={`/companies/${company.id}/members`} 
                        className={cn(
                          "flex items-center px-2 py-1.5 text-sm rounded",
                          pathname === `/companies/${company.id}/members` 
                            ? "bg-[#1164A3] text-white" 
                            : "hover:bg-gray-700"
                        )}
                      >
                        <Users className="h-3.5 w-3.5 mr-2 text-gray-400" />
                        멤버
                      </Link>
                      
                      {(company.role === 'owner' || company.role === 'admin') && (
                        <Link 
                          href={`/companies/${company.id}/settings`} 
                          className={cn(
                            "flex items-center px-2 py-1.5 text-sm rounded",
                            pathname === `/companies/${company.id}/settings` 
                              ? "bg-[#1164A3] text-white" 
                              : "hover:bg-gray-700"
                          )}
                        >
                          <Settings className="h-3.5 w-3.5 mr-2 text-gray-400" />
                          설정
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
      
      <div className="mt-auto px-4 py-3 border-t border-gray-700">
        <div className="flex items-center text-sm">
          <div className="bg-white w-7 h-7 rounded-sm flex items-center justify-center mr-2 overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user?.username || '사용자'} className="w-full h-full object-cover" />
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