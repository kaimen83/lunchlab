import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { InvitationsList } from './InvitationsList';

export default async function InvitationsPage() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">회사 초대 관리</h1>
        
        <InvitationsList />
      </div>
    </div>
  );
} 