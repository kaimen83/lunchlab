import { redirect } from "next/navigation";

export default function VerifyPage() {
  // 인증 완료 후 메인 페이지로 리다이렉트
  redirect('/');
  
  // 리다이렉트가 즉시 발생하지 않을 경우 대비 로딩 화면
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-xl">인증 완료됨, 메인 페이지로 이동 중...</p>
    </div>
  );
} 