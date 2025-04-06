'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/types";
import { usePathname } from "next/navigation";

export function RoleDisplay() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const pathname = usePathname();

  // 사용자 로드 및 상태 변경 감지
  useEffect(() => {
    if (isLoaded && user) {
      setRole(user.publicMetadata.role as UserRole || 'user');
      
      // 메타데이터 변경 감지를 위한 주기적 체크
      const intervalId = setInterval(() => {
        const currentRole = user.publicMetadata.role as UserRole;
        if (currentRole !== role) {
          setRole(currentRole || 'user');
        }
      }, 3000);
      
      return () => clearInterval(intervalId);
    }
  }, [isLoaded, user, role]);

  // 로그인 상태나 사용자 변경 감지
  useEffect(() => {
    if (isLoaded && user) {
      setRole(user.publicMetadata.role as UserRole || 'user');
    }
  }, [isLoaded, user, isSignedIn, pathname]);

  if (!isLoaded || !user) {
    return <div>로딩 중...</div>;
  }

  // 역할에 따른 스타일 변경
  const getRoleStyle = (userRole: UserRole | null): string => {
    switch (userRole) {
      case 'headAdmin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'tester':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const roleLabels: Record<UserRole, string> = {
    headAdmin: '최고 관리자',
    user: '일반사용자',
    tester: '테스터'
  };

  return (
    <div className={`mt-4 p-3 rounded-md border ${getRoleStyle(role)}`}>
      <p className="text-sm opacity-75">현재 권한:</p>
      <p className="font-bold text-lg">{roleLabels[role || 'user']}</p>
    </div>
  );
} 