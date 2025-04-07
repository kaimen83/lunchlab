import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegisterModuleButton } from "./components/RegisterModuleButton";

export const metadata: Metadata = {
  title: "모듈 등록",
  description: "마켓플레이스에 모듈을 등록합니다.",
};

export default async function ModuleRegisterPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  // 여기에 관리자 권한 체크 로직 추가 필요
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">모듈 등록 관리</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>모듈 등록</CardTitle>
            <CardDescription>
              마켓플레이스에 모듈을 등록합니다. 모듈 등록은 관리자만 수행할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="text-lg font-medium mb-2">식재료 모듈</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  식재료 관리, 메뉴 관리, 카테고리 관리 기능을 제공하는 모듈입니다.
                </p>
                <RegisterModuleButton moduleId="ingredients-module" />
              </div>
              
              {/* 여기에 다른 모듈 추가 가능 */}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              모듈 등록은 데이터베이스에 새로운 모듈 정보를 추가합니다. 이미 등록된 모듈은 다시 등록하지 마세요.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 