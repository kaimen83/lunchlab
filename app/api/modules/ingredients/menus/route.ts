import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// 유효성 검사 스키마
const menuSchema = z.object({
  name: z.string().min(1, "메뉴 이름은 필수입니다"),
  category_id: z.string().min(1, "카테고리 ID는 필수입니다"),
  description: z.string().optional(),
  recipe: z.string().optional(),
  ingredients: z.array(
    z.object({
      ingredient_id: z.string(),
      quantity: z.number().min(0),
    })
  ).optional(),
  cooking_time: z.number().min(0).optional(),
  difficulty: z.enum(["쉬움", "보통", "어려움"]).optional(),
  image_url: z.string().url().optional(),
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다"),
});

// 메뉴 재료 타입
interface MenuIngredient {
  ingredient_id: string;
  quantity: number;
}

// 메뉴 타입 정의
interface Menu {
  id: string;
  name: string;
  category_id: string;
  description: string;
  recipe: string;
  ingredients: MenuIngredient[];
  cooking_time: number;
  difficulty: "쉬움" | "보통" | "어려움";
  image_url: string;
  companyId: string;
  created_at: string;
  updated_at: string;
}

// 더미 데이터 저장소 (실제 구현에서는 데이터베이스로 대체)
let menus: Menu[] = [
  {
    id: "1",
    name: "제육볶음",
    category_id: "10", // 메인 요리 카테고리
    description: "매콤한 양념에 볶은 돼지고기 요리",
    recipe: "1. 돼지고기를 얇게 썬다. 2. 양념장을 만든다. 3. 고기에 양념을 넣고 조물조물 무친다. 4. 팬에 볶는다.",
    ingredients: [
      { ingredient_id: "2", quantity: 500 }, // 돼지고기 (삼겹살) 500g
    ],
    cooking_time: 30,
    difficulty: "보통",
    image_url: "https://example.com/images/jeyuk.jpg",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
  {
    id: "2",
    name: "된장찌개",
    category_id: "12", // 국/찌개 카테고리
    description: "구수한 된장으로 끓인 찌개",
    recipe: "1. 물을 끓인다. 2. 된장을 푼다. 3. 채소와 두부를 넣는다. 4. 중불에서 끓인다.",
    ingredients: [],
    cooking_time: 20,
    difficulty: "쉬움",
    image_url: "https://example.com/images/doenjang.jpg",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
];

// 모든 메뉴 조회 또는 카테고리별 필터링
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "회사 ID가 필요합니다" }, { status: 400 });
  }

  const categoryId = request.nextUrl.searchParams.get("categoryId");
  let filteredMenus = menus.filter(
    (menu) => menu.companyId === companyId
  );

  // 카테고리별 필터링 (있는 경우)
  if (categoryId) {
    filteredMenus = filteredMenus.filter(
      (menu) => menu.category_id === categoryId
    );
  }

  return NextResponse.json({ menus: filteredMenus });
}

// 새 메뉴 생성
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = menuSchema.parse(body);

    const newMenu: Menu = {
      id: uuidv4(),
      name: validatedData.name,
      category_id: validatedData.category_id,
      description: validatedData.description || "",
      recipe: validatedData.recipe || "",
      ingredients: validatedData.ingredients || [],
      cooking_time: validatedData.cooking_time || 0,
      difficulty: validatedData.difficulty || "보통",
      image_url: validatedData.image_url || "",
      companyId: validatedData.companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 실제 구현에서는 데이터베이스에 저장
    menus.push(newMenu);

    return NextResponse.json(
      { message: "메뉴가 생성되었습니다", menu: newMenu },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("메뉴 생성 오류:", error);
    return NextResponse.json(
      { error: "메뉴를 생성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 