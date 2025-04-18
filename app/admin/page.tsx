import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import AdminPanel from '@/components/AdminPanel';

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
      <h1 className="text-3xl font-bold mb-4">관리자 페이지</h1>
      <AdminPanel />
    </div>
  );
} 