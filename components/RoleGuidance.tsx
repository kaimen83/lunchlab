'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/types";
import Link from "next/link";

export function RoleGuidance() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);

  // 사용자 로드 및 메타데이터 변경 감지
  useEffect(() => {
    if (isLoaded && user) {
      setRole(user.publicMetadata.role as UserRole || 'user');
      
      // 메타데이터 변경 감지를 위한 주기적 체크 (3초마다)
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
  }, [isLoaded, user, isSignedIn]);

  if (!isLoaded || !user) {
    return <div className="mt-12 text-center max-w-lg">로딩 중...</div>;
  }

  // 사용자 역할에 따른 안내 문구 렌더링
  return (
    <div className="mt-12 text-center max-w-lg">
      {role === 'user' && (
        <>
          <h2 className="text-2xl font-bold mb-3">일반사용자 안내</h2>
          <p className="mb-3">
            일반사용자 권한으로 로그인하셨습니다. 기본 기능을 사용할 수 있습니다.
          </p>
        </>
      )}
      
      {role === 'tester' && (
        <>
          <h2 className="text-2xl font-bold mb-3">테스터 안내</h2>
          <p className="mb-3">
            테스터 권한으로 로그인하셨습니다. 테스트 목적으로 시스템을 사용할 수 있습니다.
          </p>
        </>
      )}
      
      {role === 'headAdmin' && (
        <>
          <h2 className="text-2xl font-bold mb-3">최고 관리자 안내</h2>
          <p className="mb-3">
            최고 관리자 권한으로 로그인하셨습니다. 시스템의 모든 기능에 접근하실 수 있습니다.
          </p>
          <p className="mb-3">
            사용자 권한 관리는 <Link href="/admin" className="text-blue-500 hover:underline">관리자 페이지</Link>에서 수행할 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
} 