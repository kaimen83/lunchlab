import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/clerk';
import { CreateCompanyForm } from '@/components/CreateCompanyForm';

export default async function NewCompanyPage() {
  // 권한 체크
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 사용자 역할 확인 (최고관리자 또는 일반사용자만 접근 가능)
  const userRole = await getUserRole(userId);
  const canCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  
  if (!canCreateCompany) {
    // 권한이 없는 사용자의 경우 홈으로 리다이렉트
    redirect('/');
  }
  
  return (
    <div className="max-w-md mx-auto py-12">
      <CreateCompanyForm />
    </div>
  );
} 