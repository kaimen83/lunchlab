'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/types";

export function RoleDisplay() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      setRole(user.publicMetadata.role as UserRole || 'pending');
    }
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return <div>로딩 중...</div>;
  }

  const roleLabels: Record<UserRole, string> = {
    admin: '관리자',
    employee: '일반직원',
    viewer: '뷰어',
    pending: '가입대기'
  };

  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-md">
      <p className="text-sm text-gray-600">현재 권한:</p>
      <p className="font-bold">{roleLabels[role || 'pending']}</p>
    </div>
  );
} 