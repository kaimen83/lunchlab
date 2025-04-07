import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// 유효성 검사 스키마
const ingredientSchema = z.object({
  name: z.string().min(1, "식재료 이름은 필수입니다"),
  category_id: z.string().min(1, "카테고리 ID는 필수입니다"),
  unit: z.string().min(1, "단위는 필수입니다"),
  price_per_unit: z.number().min(0, "단위당 가격은 0 이상이어야 합니다"),
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
  companyId: z.string().uuid("유효한 회사 ID가 필요합니다"),
});

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

// 모든 식재료 조회 또는 카테고리별 필터링
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
  let filteredIngredients = ingredients.filter(
    (item) => item.companyId === companyId
  );

  // 카테고리별 필터링 (있는 경우)
  if (categoryId) {
    filteredIngredients = filteredIngredients.filter(
      (item) => item.category_id === categoryId
    );
  }

  return NextResponse.json({ ingredients: filteredIngredients });
}

// 새 식재료 생성
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = ingredientSchema.parse(body);

    // nutrition_info가 제공되지 않거나 일부만 제공된 경우 기본값으로 채움
    const nutritionInfo: NutritionInfo = {
      protein: validatedData.nutrition_info?.protein || 0,
      fat: validatedData.nutrition_info?.fat || 0,
      carbohydrates: validatedData.nutrition_info?.carbohydrates || 0,
      fiber: validatedData.nutrition_info?.fiber || 0,
      sugar: validatedData.nutrition_info?.sugar || 0,
      sodium: validatedData.nutrition_info?.sodium || 0,
    };

    const newIngredient: Ingredient = {
      id: uuidv4(),
      name: validatedData.name,
      category_id: validatedData.category_id,
      unit: validatedData.unit,
      price_per_unit: validatedData.price_per_unit,
      calories_per_unit: validatedData.calories_per_unit || 0,
      allergens: validatedData.allergens || [],
      nutrition_info: nutritionInfo,
      storage_method: validatedData.storage_method || "",
      companyId: validatedData.companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 실제 구현에서는 데이터베이스에 저장
    ingredients.push(newIngredient);

    return NextResponse.json(
      { message: "식재료가 생성되었습니다", ingredient: newIngredient },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효성 검사 오류", details: error.errors },
        { status: 400 }
      );
    }
    console.error("식재료 생성 오류:", error);
    return NextResponse.json(
      { error: "식재료를 생성하는 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
} 