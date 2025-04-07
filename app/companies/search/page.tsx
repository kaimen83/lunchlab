import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CompanySearch from './CompanySearch';

export default async function CompanySearchPage() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">회사 검색</h1>
      <p className="text-gray-600 mb-6">
        가입하고 싶은 회사를 검색하고 가입 신청을 해보세요.
      </p>
      
      <CompanySearch />
    </div>
  );
} 