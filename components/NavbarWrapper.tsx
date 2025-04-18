'use client';

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

/**
 * Navbar 컴포넌트 래퍼
 * - 현재 라우트 기반으로 Navbar 표시 여부 결정
 * - 탭 간 전환 시 병렬 라우트 슬롯 표시 제어
 */
export function NavbarWrapper() {
  const pathname = usePathname();
  const router = useRouter();
  const isCompaniesRoute = pathname?.startsWith('/companies');
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  // 경로 변경 시 활성 탭 상태 업데이트
  useEffect(() => {
    if (pathname === '/admin') {
      setActiveTab('admin');
    } else if (pathname === '/invitations') {
      setActiveTab('invitations');
    } else {
      setActiveTab(null);
    }
  }, [pathname]);
  
  // 활성 탭 변경 시 해당 병렬 라우트 슬롯 표시/숨김 제어
  useEffect(() => {
    const adminTab = document.getElementById('admin-tab');
    const invitationsTab = document.getElementById('invitations-tab');
    
    if (adminTab) {
      adminTab.className = activeTab === 'admin' ? 'block' : 'hidden';
    }
    
    if (invitationsTab) {
      invitationsTab.className = activeTab === 'invitations' ? 'block' : 'hidden';
    }
  }, [activeTab]);
  
  // 탭 전환 함수
  const handleTabChange = (tabName: string, href: string) => {
    // 이미 프리로드된 탭을 표시하면서 라우트 변경
    setActiveTab(tabName);
    router.push(href);
  };
  
  if (isCompaniesRoute) {
    return null;
  }
  
  return <Navbar onTabChange={handleTabChange} activeTab={activeTab} />;
} 