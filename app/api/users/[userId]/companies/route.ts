import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserCompanies } from "@/lib/supabase-queries";

// Next.js 15에서 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 현재 인증된 사용자 확인
    const { userId: currentUserId } = await auth();
    
    // params는 Promise이므로 await 사용
    const { userId } = await context.params;
    
    // 인증되지 않은 요청 차단
    if (!currentUserId) {
      return NextResponse.json(
        { error: "인증되지 않은 요청입니다." },
        { status: 401 }
      );
    }
    
    // 요청 경로의 userId와 현재 인증된 userId가 일치하는지 확인
    // (자신의 회사 목록만 조회 가능)
    if (userId !== currentUserId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 }
      );
    }
    
    // 회사 목록 조회
    const { companies, error } = await getUserCompanies(userId);
    
    if (error) {
      console.error("회사 목록 조회 오류:", error);
      return NextResponse.json(
        { error: "회사 목록을 조회하는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("회사 목록 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 