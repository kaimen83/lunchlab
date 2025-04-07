import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMarketplaceModules } from "@/lib/marketplace/queries";
import { MarketplaceHeader } from "./components/MarketplaceHeader";
import { ModuleGrid } from "./components/ModuleGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "마켓플레이스 - 런치랩",
  description: "런치랩 모듈 마켓플레이스",
};

export default async function MarketplacePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 모듈 데이터 가져오기
  const { modules, error } = await getMarketplaceModules();
  
  if (error) {
    console.error('모듈 데이터 조회 오류:', error);
  }
  
  // 모듈을 카테고리별로 분류
  const categories = [...new Set(modules.map(module => module.category))];
  
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <MarketplaceHeader />
      
      <Tabs defaultValue="all" className="mt-8">
        <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-8">
          <TabsTrigger value="all">전체</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="all">
          <ModuleGrid modules={modules} />
        </TabsContent>
        
        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <ModuleGrid modules={modules.filter(module => module.category === category)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 