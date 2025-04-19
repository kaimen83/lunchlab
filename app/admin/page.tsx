import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import AdminPanel from '@/components/AdminPanel';
import FeedbackPanel from '@/components/feedback/FeedbackPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, UserCog } from 'lucide-react';

export default async function AdminPage() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 최고 관리자 권한 확인
  const isHeadAdminUser = await isHeadAdmin(userId);
  
  // 최고 관리자가 아닌 경우 메인 페이지로 리다이렉트
  if (!isHeadAdminUser) {
    redirect('/');
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>
      
      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            관리자 패널
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            피드백 관리
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="admin" className="space-y-4">
          <AdminPanel />
        </TabsContent>
        
        <TabsContent value="feedback" className="space-y-4">
          <FeedbackPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
} 