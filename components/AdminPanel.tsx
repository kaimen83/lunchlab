'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import CompanyManagement from '@/components/admin/CompanyManagement';
import { removePointerEventsFromBody } from '@/lib/utils/admin';

export default function AdminPanel() {
  const [adminTab, setAdminTab] = useState('users');

  // touchEventFixer를 위한 글로벌 이벤트 리스너 추가
  useEffect(() => {
    const handlePointerEvent = () => {
      if (typeof document !== "undefined" && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener("pointerup", handlePointerEvent);
    document.addEventListener("touchend", handlePointerEvent);

    // 클린업 함수
    return () => {
      document.removeEventListener("pointerup", handlePointerEvent);
      document.removeEventListener("touchend", handlePointerEvent);
    };
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" value={adminTab} onValueChange={setAdminTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building className="mr-2 h-4 w-4" />
            회사 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="companies">
          <CompanyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
} 