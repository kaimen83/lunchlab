import { redirect } from 'next/navigation';

interface MenusPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MenusPage({ params }: MenusPageProps) {
  const { id: companyId } = await params;
  
  // 통합 페이지로 리다이렉트합니다. tab 파라미터를 menus로 설정
  redirect(`/companies/${companyId}/inventory?tab=menus`);
} 