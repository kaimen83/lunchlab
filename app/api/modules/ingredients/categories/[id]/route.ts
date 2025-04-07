import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// 더미 데이터 저장소 (실제 구현에서는 데이터베이스로 대체)
// 이 예제에서는 메모리에 저장되므로 서버 재시작 시 초기화됩니다
let categories = [
  {
    id: "1",
    name: "육류",
    type: "ingredient",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
  {
    id: "2",
    name: "어패류",
    type: "ingredient",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
];

// 유효성 검사 스키마
const updateCategorySchema = z.object({
  name: z.string().min(1, "카테고리 이름은 필수입니다").optional(),
  type: z.enum(["ingredient", "menu"], {
    required_error: "타입은 'ingredient' 또는 'menu'여야 합니다",
  }).optional(),
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다").optional(),
});

// 특정 카테고리 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const category = categories.find((cat) => cat.id === id);

  if (!category) {
    return NextResponse.json(
      { error: "카테고리를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({ category });
}

// 카테고리 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const categoryIndex = categories.findIndex((cat) => cat.id === id);

  if (categoryIndex === -1) {
    return NextResponse.json(
      { error: "카테고리를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // 현재 카테고리 정보 가져오기
    const currentCategory = categories[categoryIndex];

    // 업데이트된 카테고리 정보 생성
    const updatedCategory = {
      ...currentCategory,
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    // 메모리에 업데이트 (실제 구현에서는 데이터베이스 업데이트)
    categories[categoryIndex] = updatedCategory;

    return NextResponse.json({
      message: "카테고리가 업데이트되었습니다",
      category: updatedCategory,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("카테고리 업데이트 오류:", error);
    return NextResponse.json(
      { error: "카테고리를 업데이트하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 카테고리 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const categoryIndex = categories.findIndex((cat) => cat.id === id);

  if (categoryIndex === -1) {
    return NextResponse.json(
      { error: "카테고리를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 실제 구현에서는 카테고리와 연결된 데이터 처리도 고려해야 합니다
  // 예: 삭제 전에 이 카테고리를 사용하는 항목이 있는지 확인

  // 메모리에서 삭제 (실제 구현에서는 데이터베이스에서 삭제)
  categories.splice(categoryIndex, 1);

  return NextResponse.json({
    message: "카테고리가 삭제되었습니다",
  });
} 