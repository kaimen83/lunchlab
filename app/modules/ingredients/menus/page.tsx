import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getCompany } from "@/lib/company";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTable } from "./components/DataTable";
import { Menu, columns } from "./components/Columns";

export const metadata: Metadata = {
  title: "메뉴 관리",
  description: "메뉴 정보를 관리합니다.",
};

function generateDummyData() {
  const menus: Menu[] = [
    {
      id: "1",
      name: "소고기 스테이크",
      category_id: "1",
      category: "메인 요리",
      ingredients: [
        { ingredient_id: "1", quantity: 200, unit: "g" },
        { ingredient_id: "3", quantity: 1, unit: "개" },
      ],
      cooking_time: 30,
      difficulty: "보통",
      image_url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8c3RlYWt8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      name: "돼지고기 김치찌개",
      category_id: "2",
      category: "찌개",
      ingredients: [
        { ingredient_id: "2", quantity: 150, unit: "g" },
        { ingredient_id: "3", quantity: 1, unit: "개" },
        { ingredient_id: "4", quantity: 1, unit: "개" },
      ],
      cooking_time: 40,
      difficulty: "쉬움",
      image_url: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8a29yZWFuJTIwZm9vZHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      name: "계란 프라이",
      category_id: "3",
      category: "아침 식사",
      ingredients: [
        { ingredient_id: "6", quantity: 2, unit: "개" },
      ],
      cooking_time: 5,
      difficulty: "쉬움",
      image_url: "https://images.unsplash.com/photo-1606289259741-25852a63d355?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8OHx8ZnJpZWQlMjBlZ2d8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60",
      created_at: new Date().toISOString(),
    },
    {
      id: "4",
      name: "우유 푸딩",
      category_id: "4",
      category: "디저트",
      ingredients: [
        { ingredient_id: "5", quantity: 200, unit: "ml" },
        { ingredient_id: "6", quantity: 1, unit: "개" },
      ],
      cooking_time: 60,
      difficulty: "어려움",
      image_url: "https://images.unsplash.com/photo-1488477181946-6428a0bfdf6e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHVkZGluZ3xlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60",
      created_at: new Date().toISOString(),
    },
  ];
  
  return menus;
}

export default async function MenusPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const company = await getCompany(userId);
  if (!company) {
    redirect("/companies");
  }

  const data = generateDummyData();
  
  return (
    <ModuleLayout
      title="메뉴 관리"
      description="메뉴를 관리하고 추가합니다."
      moduleId="ingredients-module"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 메뉴 추가
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>메뉴 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </ModuleLayout>
  );
} 