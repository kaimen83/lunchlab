import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    
    // 로그인하지 않은 경우
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const companyId = resolvedParams.id;
    const supabase = createServerSupabaseClient();

    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("company_memberships")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have permission to access this company" },
        { status: 403 }
      );
    }

    // 식자재 목록 조회
    let ingredientsQuery = supabase
      .from("ingredients")
      .select("*")
      .eq("company_id", companyId);

    // 검색어가 있는 경우 필터링
    if (query) {
      ingredientsQuery = ingredientsQuery.ilike("name", `%${query}%`);
    }

    const { data: ingredients, error: ingredientsError } = await ingredientsQuery;

    if (ingredientsError) {
      console.error("식자재 조회 오류:", ingredientsError);
      return NextResponse.json(
        { error: "Failed to fetch ingredients" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ingredients });
  } catch (error) {
    console.error("API 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 