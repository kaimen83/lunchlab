import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

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
// 이 예제에서는 메모리에 저장되므로 서버 재시작 시 초기화됩니다
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

// 유효성 검사 스키마
const updateMenuSchema = z.object({
  name: z.string().min(1, "메뉴 이름은 필수입니다").optional(),
  category_id: z.string().min(1, "카테고리 ID는 필수입니다").optional(),
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
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다").optional(),
});

// 특정 메뉴 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const menu = menus.find((item) => item.id === id);

  if (!menu) {
    return NextResponse.json(
      { error: "메뉴를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({ menu });
}

// 메뉴 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const menuIndex = menus.findIndex((item) => item.id === id);

  if (menuIndex === -1) {
    return NextResponse.json(
      { error: "메뉴를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = updateMenuSchema.parse(body);

    // 현재 메뉴 정보 가져오기
    const currentMenu = menus[menuIndex];

    // 업데이트된 메뉴 정보 생성
    const updatedMenu: Menu = {
      ...currentMenu,
      name: validatedData.name ?? currentMenu.name,
      category_id: validatedData.category_id ?? currentMenu.category_id,
      description: validatedData.description ?? currentMenu.description,
      recipe: validatedData.recipe ?? currentMenu.recipe,
      ingredients: validatedData.ingredients ?? currentMenu.ingredients,
      cooking_time: validatedData.cooking_time ?? currentMenu.cooking_time,
      difficulty: validatedData.difficulty ?? currentMenu.difficulty,
      image_url: validatedData.image_url ?? currentMenu.image_url,
      companyId: validatedData.companyId ?? currentMenu.companyId,
      updated_at: new Date().toISOString(),
    };

    // 메모리에 업데이트 (실제 구현에서는 데이터베이스 업데이트)
    menus[menuIndex] = updatedMenu;

    return NextResponse.json({
      message: "메뉴가 업데이트되었습니다",
      menu: updatedMenu,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("메뉴 업데이트 오류:", error);
    return NextResponse.json(
      { error: "메뉴를 업데이트하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 메뉴 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const menuIndex = menus.findIndex((item) => item.id === id);

  if (menuIndex === -1) {
    return NextResponse.json(
      { error: "메뉴를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 실제 구현에서는 메뉴와 연결된 데이터 처리도 고려해야 합니다
  // 예: 삭제 전에 이 메뉴를 사용하는 식단이 있는지 확인

  // 메모리에서 삭제 (실제 구현에서는 데이터베이스에서 삭제)
  menus.splice(menuIndex, 1);

  return NextResponse.json({
    message: "메뉴가 삭제되었습니다",
  });
} 