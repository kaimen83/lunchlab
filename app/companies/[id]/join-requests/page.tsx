import { redirect } from 'next/navigation';

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface JoinRequestsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JoinRequestsPage({ params }: JoinRequestsPageProps) {
  // Next.js 15에서는 params가 Promise이므로 await로 처리
  const { id: companyId } = await params;
  
  // 멤버 페이지의 가입 신청 탭으로 리다이렉트
  redirect(`/companies/${companyId}/members?tab=requests`);
} 