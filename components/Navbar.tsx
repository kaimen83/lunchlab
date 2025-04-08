'use client';

import Link from 'next/link';
import { UserButton, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Shield } from 'lucide-react';

export function Navbar() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  // companies 경로에서는 렌더링하지 않음
  const isCompaniesRoute = pathname?.startsWith('/companies');
  
  // 메타데이터 변경 실시간 감지를 위한 폴링 효과
  useEffect(() => {
    if (isLoaded && user) {
      // 초기 역할 설정
      setRole(user.publicMetadata.role as UserRole || null);
      
      // 메타데이터 변경 주기적 확인 (5초마다)
      const intervalId = setInterval(() => {
        const currentRole = user.publicMetadata.role as UserRole;
        if (currentRole !== role) {
          setRole(currentRole || null);
          // 역할이 변경되면 현재 페이지 새로고침
          if (pathname === '/') {
            router.refresh();
          }
        }
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [isLoaded, user, pathname, router, role]);

  // 로그인 상태나 사용자 변경 감지
  useEffect(() => {
    if (isLoaded && user) {
      setRole(user.publicMetadata.role as UserRole || null);
    }
  }, [isLoaded, user, isSignedIn]);

  // 모든 훅을 호출한 후에 조건부 반환
  if (isCompaniesRoute) {
    return null;
  }

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-800">
                LunchLab
              </Link>
            </div>
            <nav className="ml-6 flex items-center space-x-4">
              <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                홈
              </Link>
              {role === 'headAdmin' && (
                <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  관리자
                </Link>
              )}
              <Link href="/invitations" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                초대 관리
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 