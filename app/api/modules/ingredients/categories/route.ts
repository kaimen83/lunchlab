import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// 유효성 검사 스키마
const categorySchema = z.object({
  name: z.string().min(1, "카테고리 이름은 필수입니다"),
  type: z.enum(["ingredient", "menu"], {
    required_error: "타입은 'ingredient' 또는 'menu'여야 합니다",
  }),
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다"),
});

// 더미 데이터 저장소 (실제 구현에서는 데이터베이스로 대체)
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

// 모든 카테고리 조회 또는 타입별 필터링
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "회사 ID가 필요합니다" }, { status: 400 });
  }

  const type = request.nextUrl.searchParams.get("type");
  let filteredCategories = categories.filter(
    (cat) => cat.companyId === companyId
  );

  // 타입별 필터링 (있는 경우)
  if (type && ["ingredient", "menu"].includes(type)) {
    filteredCategories = filteredCategories.filter((cat) => cat.type === type);
  }

  return NextResponse.json({ categories: filteredCategories });
}

// 새 카테고리 생성
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = categorySchema.parse(body);

    const newCategory = {
      id: uuidv4(),
      name: validatedData.name,
      type: validatedData.type,
      companyId: validatedData.companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 실제 구현에서는 데이터베이스에 저장
    categories.push(newCategory);

    return NextResponse.json(
      { message: "카테고리가 생성되었습니다", category: newCategory },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("카테고리 생성 오류:", error);
    return NextResponse.json(
      { error: "카테고리를 생성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 