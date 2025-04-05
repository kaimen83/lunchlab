import { redirect } from "next/navigation";

export default function VerifyEmailAddressPage() {
  // 이메일 주소 확인 페이지가 필요한 경우 여기에 내용 추가
  // 현재는 간단히 메인 페이지로 리다이렉트
  redirect('/');
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-xl">이메일 확인 중, 잠시만 기다려주세요...</p>
    </div>
  );
} 