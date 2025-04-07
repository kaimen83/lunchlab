import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCompany } from "@/lib/company";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, ShoppingBasket, Tags, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "식재료 및 메뉴 관리",
  description: "식재료와 메뉴를 관리하는 모듈입니다.",
};

// 더미 데이터 생성 (실제 구현에서는 API 호출로 대체)
function generateDummyStats() {
  return {
    ingredients: 125,
    menus: 48,
    categories: 22
  };
}

export default async function IngredientsModulePage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const company = await getCompany(userId);
  if (!company) {
    redirect("/companies");
  }
  
  // 더미 통계 데이터
  const stats = generateDummyStats();
  
  return (
    <ModuleLayout
      title="식재료 및 메뉴 관리"
      description="식재료와 메뉴를 관리합니다."
      moduleId="ingredients-module"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">식재료 관리</CardTitle>
            <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ingredients}개</div>
            <p className="text-xs text-muted-foreground">
              등록된 식재료
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/modules/ingredients/ingredients">
                관리하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">메뉴 관리</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.menus}개</div>
            <p className="text-xs text-muted-foreground">
              등록된 메뉴
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/modules/ingredients/menus">
                관리하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">카테고리 관리</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}개</div>
            <p className="text-xs text-muted-foreground">
              등록된 카테고리
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/modules/ingredients/categories">
                관리하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>최근 추가된 식재료</CardTitle>
            <CardDescription>
              최근에 추가된 식재료 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              아직 등록된 식재료가 없습니다
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>최근 추가된 메뉴</CardTitle>
            <CardDescription>
              최근에 추가된 메뉴 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              아직 등록된 메뉴가 없습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
} 