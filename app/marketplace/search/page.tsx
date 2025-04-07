import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { searchMarketplaceModules } from "@/lib/marketplace/queries";
import { ModuleGrid } from "../components/ModuleGrid";

export const metadata = {
  title: "모듈 검색 - 마켓플레이스",
  description: "모듈 검색 결과",
};

interface SearchPageProps {
  params: Promise<{}>;
  searchParams: { q?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  const searchQuery = searchParams.q || '';
  
  // 검색 쿼리가 없는 경우 마켓플레이스로 리다이렉트
  if (!searchQuery.trim()) {
    redirect('/marketplace');
  }
  
  // 모듈 검색
  const { modules, error } = await searchMarketplaceModules(searchQuery);
  
  if (error) {
    console.error('모듈 검색 오류:', error);
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/marketplace" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          마켓플레이스로 돌아가기
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">검색 결과</h1>
        <p className="mt-2 text-muted-foreground">
          '{searchQuery}'에 대한 검색 결과입니다.
        </p>
      </div>
      
      {modules.length > 0 ? (
        <ModuleGrid modules={modules} />
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">일치하는 모듈을 찾을 수 없습니다</h2>
          <p className="text-muted-foreground">
            다른 검색어를 사용하거나 카테고리를 둘러보세요.
          </p>
        </div>
      )}
    </div>
  );
} 