import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { registerIngredientsModule } from "@/lib/modules/ingredients/register";

// 모듈 ID에 맞는 등록 함수 매핑
const moduleRegisterFunctions: Record<string, () => Promise<any>> = {
  "ingredients-module": registerIngredientsModule,
  // 추후 다른 모듈들을 여기에 추가
};

export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 체크
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "인증되지 않은 요청입니다." },
        { status: 401 }
      );
    }

    // 여기에 관리자 권한 체크 로직이 추가되어야 함

    // 요청 데이터 파싱
    const { moduleId } = await request.json();

    if (!moduleId) {
      return NextResponse.json(
        { error: "모듈 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 해당 모듈의 등록 함수 확인
    const registerFunction = moduleRegisterFunctions[moduleId];
    if (!registerFunction) {
      return NextResponse.json(
        { error: "지원되지 않는 모듈입니다." },
        { status: 404 }
      );
    }

    // 모듈 등록 실행
    const result = await registerFunction();

    if (!result.success) {
      return NextResponse.json(
        { error: "모듈 등록 실패", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "모듈이 성공적으로 등록되었습니다.", module: result.module },
      { status: 200 }
    );
  } catch (error) {
    console.error("모듈 등록 처리 중 오류:", error);
    return NextResponse.json(
      { error: "모듈 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 