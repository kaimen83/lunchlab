import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCompany } from "@/lib/company";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoryList, CategoryType } from "./components/CategoryList";

export const metadata: Metadata = {
  title: "카테고리 관리",
  description: "식재료 및 메뉴 카테고리를 관리합니다.",
};

// 더미 데이터 생성
function generateDummyData() {
  return [
    {
      id: "1",
      name: "육류",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "2",
      name: "어패류",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "3",
      name: "채소",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "4",
      name: "과일",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "5", 
      name: "조미료",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "6",
      name: "유제품",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "7",
      name: "곡물",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "8",
      name: "기타",
      type: "ingredient" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "10",
      name: "메인 요리",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "11",
      name: "반찬",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "12",
      name: "국/찌개",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "13",
      name: "분식",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "14",
      name: "디저트",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
    {
      id: "15",
      name: "아침 식사",
      type: "menu" as CategoryType,
      created_at: "2023-12-01T00:00:00Z",
    },
  ];
}

export default async function CategoriesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const company = await getCompany(userId);
  if (!company) {
    redirect("/companies");
  }
  
  // 더미 데이터 사용
  const categories = generateDummyData();
  
  return (
    <ModuleLayout
      title="카테고리 관리"
      description="식재료 및 메뉴 카테고리를 관리합니다."
      moduleId="ingredients-module"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          카테고리 추가
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>식재료 카테고리</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryList 
              categories={categories.filter(c => c.type === "ingredient")} 
              type="ingredient" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>메뉴 카테고리</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryList 
              categories={categories.filter(c => c.type === "menu")} 
              type="menu" 
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
} 