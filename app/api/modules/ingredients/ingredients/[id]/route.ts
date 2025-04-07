import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// 영양 정보 타입 정의
interface NutritionInfo {
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// 식재료 타입 정의
interface Ingredient {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  price_per_unit: number;
  calories_per_unit: number;
  allergens: string[];
  nutrition_info: NutritionInfo;
  storage_method: string;
  companyId: string;
  created_at: string;
  updated_at: string;
}

// 더미 데이터 저장소 (실제 구현에서는 데이터베이스로 대체)
// 이 예제에서는 메모리에 저장되므로 서버 재시작 시 초기화됩니다
let ingredients: Ingredient[] = [
  {
    id: "1",
    name: "소고기 (한우)",
    category_id: "1", // 육류 카테고리
    unit: "100g",
    price_per_unit: 8500,
    calories_per_unit: 250,
    allergens: [],
    nutrition_info: {
      protein: 22,
      fat: 15,
      carbohydrates: 0,
      fiber: 0,
      sugar: 0,
      sodium: 60,
    },
    storage_method: "냉장 보관",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
  {
    id: "2",
    name: "돼지고기 (삼겹살)",
    category_id: "1", // 육류 카테고리
    unit: "100g",
    price_per_unit: 2500,
    calories_per_unit: 300,
    allergens: [],
    nutrition_info: {
      protein: 18,
      fat: 25,
      carbohydrates: 0,
      fiber: 0,
      sugar: 0,
      sodium: 70,
    },
    storage_method: "냉장 보관",
    companyId: "sample-company-id",
    created_at: new Date("2023-12-01").toISOString(),
    updated_at: new Date("2023-12-01").toISOString(),
  },
];

// 유효성 검사 스키마
const updateIngredientSchema = z.object({
  name: z.string().min(1, "식재료 이름은 필수입니다").optional(),
  category_id: z.string().min(1, "카테고리 ID는 필수입니다").optional(),
  unit: z.string().min(1, "단위는 필수입니다").optional(),
  price_per_unit: z.number().min(0, "단위당 가격은 0 이상이어야 합니다").optional(),
  calories_per_unit: z.number().min(0, "단위당 칼로리는 0 이상이어야 합니다").optional(),
  allergens: z.array(z.string()).optional(),
  nutrition_info: z.object({
    protein: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    carbohydrates: z.number().min(0).optional(),
    fiber: z.number().min(0).optional(),
    sugar: z.number().min(0).optional(),
    sodium: z.number().min(0).optional(),
  }).optional(),
  storage_method: z.string().optional(),
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다").optional(),
});

// 특정 식재료 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const ingredient = ingredients.find((item) => item.id === id);

  if (!ingredient) {
    return NextResponse.json(
      { error: "식재료를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ingredient });
}

// 식재료 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const ingredientIndex = ingredients.findIndex((item) => item.id === id);

  if (ingredientIndex === -1) {
    return NextResponse.json(
      { error: "식재료를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    // 현재 식재료 정보 가져오기
    const currentIngredient = ingredients[ingredientIndex];

    // 영양 정보 업데이트 처리
    let updatedNutritionInfo = { ...currentIngredient.nutrition_info };
    if (validatedData.nutrition_info) {
      updatedNutritionInfo = {
        protein: validatedData.nutrition_info.protein ?? updatedNutritionInfo.protein,
        fat: validatedData.nutrition_info.fat ?? updatedNutritionInfo.fat,
        carbohydrates: validatedData.nutrition_info.carbohydrates ?? updatedNutritionInfo.carbohydrates,
        fiber: validatedData.nutrition_info.fiber ?? updatedNutritionInfo.fiber,
        sugar: validatedData.nutrition_info.sugar ?? updatedNutritionInfo.sugar,
        sodium: validatedData.nutrition_info.sodium ?? updatedNutritionInfo.sodium,
      };
    }

    // 업데이트된 식재료 정보 생성
    const updatedIngredient: Ingredient = {
      ...currentIngredient,
      name: validatedData.name ?? currentIngredient.name,
      category_id: validatedData.category_id ?? currentIngredient.category_id,
      unit: validatedData.unit ?? currentIngredient.unit,
      price_per_unit: validatedData.price_per_unit ?? currentIngredient.price_per_unit,
      calories_per_unit: validatedData.calories_per_unit ?? currentIngredient.calories_per_unit,
      allergens: validatedData.allergens ?? currentIngredient.allergens,
      nutrition_info: updatedNutritionInfo,
      storage_method: validatedData.storage_method ?? currentIngredient.storage_method,
      companyId: validatedData.companyId ?? currentIngredient.companyId,
      updated_at: new Date().toISOString(),
    };

    // 메모리에 업데이트 (실제 구현에서는 데이터베이스 업데이트)
    ingredients[ingredientIndex] = updatedIngredient;

    return NextResponse.json({
      message: "식재료가 업데이트되었습니다",
      ingredient: updatedIngredient,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("식재료 업데이트 오류:", error);
    return NextResponse.json(
      { error: "식재료를 업데이트하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 식재료 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const id = params.id;
  const ingredientIndex = ingredients.findIndex((item) => item.id === id);

  if (ingredientIndex === -1) {
    return NextResponse.json(
      { error: "식재료를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 실제 구현에서는 식재료와 연결된 데이터 처리도 고려해야 합니다
  // 예: 삭제 전에 이 식재료를 사용하는 메뉴가 있는지 확인

  // 메모리에서 삭제 (실제 구현에서는 데이터베이스에서 삭제)
  ingredients.splice(ingredientIndex, 1);

  return NextResponse.json({
    message: "식재료가 삭제되었습니다",
  });
} 