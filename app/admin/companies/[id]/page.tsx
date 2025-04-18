import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import CompanyEditForm from './CompanyEditForm';

// 회사 정보를 가져오는 함수
async function getCompanyData(id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/companies/${id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('회사 정보를 가져오는 데 실패했습니다.');
    }
    
    const data = await response.json();
    return data.company;
  } catch (error) {
    console.error('회사 정보 조회 오류:', error);
    return null;
  }
}

// 페이지 컴포넌트 Props 타입 정의
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyEditPage({ params }: PageProps) {
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
  
  // params는 Promise이므로 await 사용
  const { id } = await params;
  
  const companyData = await getCompanyData(id);
  
  // 회사 정보가 없는 경우 관리자 페이지로 리다이렉트
  if (!companyData) {
    redirect('/admin');
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">회사 정보 편집</h1>
      <CompanyEditForm company={companyData} />
    </div>
  );
} 