import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getMarketplaceModule } from "@/lib/marketplace/queries";
import { getUserCompanies } from "@/lib/supabase-queries";
import { SubscribeModule } from "../components/SubscribeModule";

interface ModuleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ModuleDetailPage({ params }: ModuleDetailPageProps) {
  const { id: moduleId } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 모듈 정보 및 기능 가져오기
  const { module, features, error } = await getMarketplaceModule(moduleId);
  
  if (error || !module) {
    notFound();
  }
  
  // 사용자의 회사 목록 가져오기
  const { companies } = await getUserCompanies(userId);
  
  const hasCompanies = companies.length > 0;
  
  return (
    <div className="container px-4 py-8 mx-auto max-w-5xl">
      <div className="mb-6">
        <Link href="/marketplace" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="h-4 w-4 mr-1" />
          마켓플레이스로 돌아가기
        </Link>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {/* 모듈 정보 */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{module.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{module.category}</Badge>
                  <span className="text-sm text-muted-foreground">버전 {module.version}</span>
                </div>
              </div>
            </div>
            <div>
              {module.price === 0 ? (
                <Badge variant="secondary" className="text-base py-1 px-2">무료</Badge>
              ) : (
                <Badge className="text-base py-1 px-2">{module.price?.toLocaleString()}원</Badge>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h2 className="text-xl font-semibold mb-3">설명</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {module.description || '이 모듈에 대한 설명이 없습니다.'}
            </p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-3">기능</h2>
            {features.length > 0 ? (
              <ul className="space-y-2">
                {features.map(feature => (
                  <li key={feature.id} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{feature.name}</p>
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">등록된 기능 정보가 없습니다.</p>
            )}
          </div>
        </div>
        
        {/* 구독 패널 */}
        <div className="space-y-6">
          {hasCompanies ? (
            <SubscribeModule moduleId={moduleId} companies={companies} />
          ) : (
            <div className="border rounded-lg p-6 bg-muted/40">
              <h3 className="text-lg font-medium mb-3">구독하려면 회사가 필요합니다</h3>
              <p className="text-muted-foreground mb-4">
                모듈을 구독하려면 먼저 회사를 생성하거나 가입해야 합니다.
              </p>
              <Button asChild>
                <Link href="/companies/new">회사 생성하기</Link>
              </Button>
            </div>
          )}
          
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-3">모듈 정보</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">발행 날짜</dt>
                <dd className="font-medium">
                  {new Date(module.created_at).toLocaleDateString('ko-KR')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">최근 업데이트</dt>
                <dd className="font-medium">
                  {module.updated_at 
                    ? new Date(module.updated_at).toLocaleDateString('ko-KR')
                    : '업데이트 정보 없음'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">승인 필요</dt>
                <dd className="font-medium">
                  {module.requires_approval ? '필요' : '불필요'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 