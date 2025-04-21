import Link from 'next/link';
import { Plus, Mail, Search, LogOut, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface SidebarActionsProps {
  userCanCreateCompany: boolean;
  handleLinkClick: () => void;
}

export function SidebarActions({ userCanCreateCompany, handleLinkClick }: SidebarActionsProps) {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 사용자의 역할을 확인하여 관리자 여부 설정
  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata.role as string;
      setIsAdmin(userRole === 'headAdmin');
    }
  }, [user]);

  return (
    <div className="mt-auto px-2 pb-4">
      <Separator className="my-3 bg-gray-700"/>
      
      {/* 회사 생성 버튼 */}
      {userCanCreateCompany && (
        <Link 
          href="/companies/new" 
          className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mb-2"
          onClick={handleLinkClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          새 회사 추가
        </Link>
      )}
      
      {/* 초대 관리 버튼 */}
      <Link 
        href="/invitations" 
        className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mb-2"
        onClick={handleLinkClick}
      >
        <Mail className="h-4 w-4 mr-2" />
        초대 관리
      </Link>
      
      {/* 회사 검색 버튼 */}
      <Link 
        href="/companies/search" 
        className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150"
        onClick={handleLinkClick}
      >
        <Search className="h-4 w-4 mr-2" />
        회사 검색
      </Link>
      
      {/* 관리자 페이지 링크 - 관리자에게만 표시 */}
      {isAdmin && (
        <Link 
          href="/admin" 
          className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mt-2"
          onClick={handleLinkClick}
        >
          <Settings className="h-4 w-4 mr-2" />
          관리자 페이지
        </Link>
      )}
    </div>
  );
} 