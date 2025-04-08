import Link from 'next/link';
import { Plus, Mail, Search, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SidebarActionsProps {
  userCanCreateCompany: boolean;
  handleLinkClick: () => void;
}

export function SidebarActions({ userCanCreateCompany, handleLinkClick }: SidebarActionsProps) {
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
      
      {/* 홈으로 돌아가기 */}
      <Link 
        href="/" 
        className="flex items-center px-3 py-2 text-sm rounded hover:bg-gray-700 text-gray-300 transition-colors duration-150 mt-2"
        onClick={handleLinkClick}
      >
        <LogOut className="h-4 w-4 mr-2" />
        홈으로 돌아가기
      </Link>
    </div>
  );
} 