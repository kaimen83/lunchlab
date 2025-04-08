import { redirect } from 'next/navigation';

interface IngredientsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IngredientsPage({ params }: IngredientsPageProps) {
  const { id: companyId } = await params;
  
  // 통합 페이지로 리다이렉트합니다. tab 파라미터를 ingredients로 설정
  redirect(`/companies/${companyId}/inventory?tab=ingredients`);
} 