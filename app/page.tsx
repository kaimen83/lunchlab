import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { RoleDisplay } from "@/components/RoleDisplay";

export default async function Home() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-8">
      <div className="absolute top-4 right-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
      
      <h1 className="text-4xl font-bold mb-4">안녕하세요!</h1>
      <p className="text-xl mb-6">Clerk 인증이 성공적으로 완료되었습니다.</p>
      
      <RoleDisplay />
    </div>
  );
}
