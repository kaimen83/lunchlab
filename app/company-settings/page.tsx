import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// 페이지 컴포넌트 Props에 대한 타입 정의
interface PageProps {
  params: Promise<Record<string, string>>;
}

export default async function CompanySettingsPage({ params }: PageProps) {
  // 인증 확인
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">회사 설정</h1>
      <div className="bg-white rounded-lg shadow p-6">
        {/* 회사 설정 내용이 여기에 추가될 예정입니다 */}
      </div>
    </div>
  );
} 