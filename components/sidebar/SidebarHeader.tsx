import Link from 'next/link';
import { X } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import { Separator } from '@/components/ui/separator';

interface SidebarHeaderProps {
  user: ReturnType<typeof useUser>['user']; 
  isMobile: boolean;
  onClose?: () => void;
}

export function SidebarHeader({ user, isMobile, onClose }: SidebarHeaderProps) {
  return (
    <>
      {/* 앱 로고 및 닫기 버튼 */}
      <div className="px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-white font-bold text-xl flex items-center">
          LunchLab
        </Link>
        {isMobile && onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        )}
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
    </>
  );
} 