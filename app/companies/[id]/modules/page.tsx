import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { checkUserCompanyAccess } from "@/lib/supabase-queries";
import { getCompanyModules } from "@/lib/marketplace/queries";
import { ModuleCard } from "./components/ModuleCard";

interface CompanyModulesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyModulesPage({ params }: CompanyModulesPageProps) {
  const { id: companyId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 회사 접근 권한 확인
  const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
  
  if (accessError || !role) {
    notFound();
  }
  
  // 회사의 모듈 목록 가져오기
  const { modules, error } = await getCompanyModules(companyId);
  
  if (error) {
    console.error('모듈 목록 조회 오류:', error);
  }
  
  const isAdmin = role === 'owner' || role === 'admin';
  
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-gray-200 bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Package className="h-5 w-5 text-gray-500 mr-2" />
          <h1 className="text-xl font-bold">모듈 관리</h1>
        </div>
        
        <Button asChild>
          <Link href="/marketplace">
            <ExternalLink className="h-4 w-4 mr-2" />
            마켓플레이스 방문
          </Link>
        </Button>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">구독 중인 모듈</h2>
            <p className="text-muted-foreground">
              회사에서 구독 중인 모듈을 관리합니다.
            </p>
          </div>
          
          <Separator className="mb-6" />
          
          {modules.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">구독 중인 모듈이 없습니다</h3>
              <p className="text-muted-foreground mb-6">
                마켓플레이스에서 필요한 모듈을 구독하세요.
              </p>
              <Button asChild>
                <Link href="/marketplace">마켓플레이스 방문하기</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(module => (
                <ModuleCard 
                  key={module.id} 
                  module={module} 
                  companyId={companyId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 