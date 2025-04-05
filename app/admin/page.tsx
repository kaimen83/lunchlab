import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/clerk';
import AdminPanel from '@/components/AdminPanel';

export default async function AdminPage() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 관리자 권한 확인
  const isAdminUser = await isAdmin(userId);
  
  // 관리자가 아닌 경우 메인 페이지로 리다이렉트
  if (!isAdminUser) {
    redirect('/');
  }
  
  return (
    <div className="container mx-auto py-8 px-4 mt-4">
      <h1 className="text-3xl font-bold mb-8">관리자 페이지</h1>
      <p className="mb-6 text-gray-600">사용자 권한을 관리할 수 있습니다. 권한 변경은 즉시 반영됩니다.</p>
      <AdminPanel />
    </div>
  );
} 