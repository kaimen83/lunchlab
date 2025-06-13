import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { utils, write } from 'xlsx';

interface MenuIngredient {
  id: string;
  menu_container_id: string;
  ingredient_id: string;
  amount: number;
  ingredient: {
    id: string;
    name: string;
    package_amount: number;
    unit: string;
    price: number;
  };
}

interface MenuContainer {
  id: string;
  menu_id: string;
  container: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
  ingredients: MenuIngredient[];
  ingredients_cost: number;
  container_price: number;
  total_cost: number;
}

interface Menu {
  id: string;
  name: string;
  description?: string;
  recipe?: string;
  cost_price: number;
  created_at: string;
  updated_at?: string;
  containers: MenuContainer[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const companyId = resolvedParams.id;
    const supabase = createServerSupabaseClient();

    // 회사 멤버십 확인
    const { data: membership, error: membershipError } = await supabase
      .from("company_memberships")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 회사 정보 조회
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    // 메뉴 목록 조회 (모든 관련 정보 포함)
    const { data: menus, error: menusError } = await supabase
      .from("menus")
      .select(`
        id,
        name,
        description,
        recipe,
        cost_price,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .order("name");

    if (menusError) {
      return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
    }

    if (!menus || menus.length === 0) {
      // 메뉴가 없는 경우 빈 엑셀 파일 생성
      const wb = utils.book_new();
      const ws = utils.aoa_to_sheet([['메뉴가 없습니다.']]);
      utils.book_append_sheet(wb, ws, '메뉴목록');
      
      const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
      const companyName = company?.name || '회사';
      const fileName = `${companyName}_메뉴목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    const menuIds = menus.map(menu => menu.id);

    // 메뉴별 용기 정보 조회
    const { data: menuContainers, error: containersError } = await supabase
      .from("menu_containers")
      .select(`
        id,
        menu_id,
        container:container_id (
          id,
          name,
          description,
          price
        )
      `)
      .in("menu_id", menuIds);

    if (containersError) {
      return NextResponse.json({ error: "Failed to fetch menu containers" }, { status: 500 });
    }

    const containerIds = (menuContainers || []).map(mc => mc.id);

    // 용기별 식재료 정보 조회
    let containerIngredients: any[] = [];
    if (containerIds.length > 0) {
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("menu_container_ingredients")
        .select(`
          id,
          menu_container_id,
          ingredient_id,
          amount,
          ingredient:ingredient_id (
            id,
            name,
            package_amount,
            unit,
            price
          )
        `)
        .in("menu_container_id", containerIds);

      if (ingredientsError) {
        console.error("용기별 식재료 조회 오류:", ingredientsError);
        // 식재료 조회 실패 시 빈 배열로 계속 진행
        containerIngredients = [];
      } else {
        containerIngredients = ingredientsData || [];
      }
    }

    // 데이터 조합
    const menusWithDetails: Menu[] = menus.map(menu => {
      const containers = (menuContainers || [])
        .filter(mc => mc.menu_id === menu.id)
        .map(menuContainer => {
          const ingredients = (containerIngredients || [])
            .filter(ci => ci.menu_container_id === menuContainer.id)
            .map(ci => ({
              ...ci,
              ingredient: ci.ingredient as any
            }));

          // 식재료 원가 계산
          const ingredients_cost = ingredients.reduce((total, item) => {
            if (!item.ingredient?.price || !item.ingredient?.package_amount) return total;
            const unitPrice = item.ingredient.price / item.ingredient.package_amount;
            return total + (unitPrice * item.amount);
          }, 0);

          const container_price = (menuContainer.container as any)?.price || 0;
          const total_cost = container_price + ingredients_cost;

          return {
            ...menuContainer,
            container: menuContainer.container as any,
            ingredients,
            ingredients_cost,
            container_price,
            total_cost
          };
        });

      return {
        ...menu,
        containers
      };
    });

    // 워크북 생성
    const wb = utils.book_new();

    // 1. 메뉴 기본 정보 시트
    const basicMenuData = [
      [
        '메뉴명',
        '설명',
        '원가(원)',
        '용기 수',
        '등록일',
        '수정일'
      ],
      ...menusWithDetails.map(menu => {
        const totalContainers = menu.containers.length;

        return [
          menu.name || '',
          menu.description || '',
          (menu.cost_price || 0).toString(),
          totalContainers.toString(),
          menu.created_at ? new Date(menu.created_at).toLocaleDateString('ko-KR') : '',
          menu.updated_at ? new Date(menu.updated_at).toLocaleDateString('ko-KR') : ''
        ];
      })
    ];

    const basicWs = utils.aoa_to_sheet(basicMenuData);
    basicWs['!cols'] = [
      { width: 20 }, // 메뉴명
      { width: 30 }, // 설명
      { width: 12 }, // 원가
      { width: 10 }, // 용기 수
      { width: 12 }, // 등록일
      { width: 12 }  // 수정일
    ];
    utils.book_append_sheet(wb, basicWs, '메뉴기본정보');

    // 2. 메뉴 상세 정보 시트 (용기별)
    const detailData = [
      [
        '메뉴명',
        '용기명',
        '용기 설명',
        '용기 가격(원)',
        '식재료 원가(원)',
        '용기 총 원가(원)',
        '사용 식재료 수',
        '주요 식재료 (상위 3개)'
      ]
    ];

    menusWithDetails.forEach(menu => {
      if (menu.containers.length === 0) {
        // 용기가 없는 메뉴
        detailData.push([
          menu.name || '',
          '-',
          '-',
          '0',
          '0',
          '0',
          '0',
          '용기 없음'
        ]);
      } else {
        menu.containers.forEach(container => {
          // 상위 3개 식재료 계산
          const topIngredients = container.ingredients
            .map(ing => ({
              name: ing.ingredient?.name || '',
              cost: ing.ingredient?.price && ing.ingredient?.package_amount 
                ? (ing.ingredient.price / ing.ingredient.package_amount) * ing.amount 
                : 0
            }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 3)
            .map(ing => ing.name)
            .join(', ');

          detailData.push([
            menu.name || '',
            container.container?.name || '',
            container.container?.description || '',
            (container.container_price || 0).toString(),
            (Math.round(container.ingredients_cost * 100) / 100).toString(),
            (Math.round(container.total_cost * 100) / 100).toString(),
            container.ingredients.length.toString(),
            topIngredients || '-'
          ]);
        });
      }
    });

    const detailWs = utils.aoa_to_sheet(detailData);
    detailWs['!cols'] = [
      { width: 20 }, // 메뉴명
      { width: 20 }, // 용기명
      { width: 25 }, // 용기 설명
      { width: 12 }, // 용기 가격
      { width: 15 }, // 식재료 원가
      { width: 15 }, // 용기 총 원가
      { width: 12 }, // 사용 식재료 수
      { width: 30 }  // 주요 식재료
    ];
    utils.book_append_sheet(wb, detailWs, '메뉴상세정보');

    // 3. 메뉴 식재료 목록 시트
    const ingredientData = [
      [
        '메뉴명',
        '용기명',
        '식재료명',
        '사용량',
        '단위',
        '식재료 단가(원)',
        '포장량',
        '단위당 가격(원)',
        '사용 원가(원)'
      ]
    ];

    menusWithDetails.forEach(menu => {
      menu.containers.forEach(container => {
        if (container.ingredients.length === 0) {
          ingredientData.push([
            menu.name || '',
            container.container?.name || '',
            '-',
            '0',
            '-',
            '0',
            '0',
            '0',
            '0'
          ]);
        } else {
          container.ingredients.forEach(ingredient => {
            const unitPrice = ingredient.ingredient?.price && ingredient.ingredient?.package_amount 
              ? ingredient.ingredient.price / ingredient.ingredient.package_amount 
              : 0;
            const usageCost = unitPrice * ingredient.amount;

            ingredientData.push([
              menu.name || '',
              container.container?.name || '',
              ingredient.ingredient?.name || '',
              (ingredient.amount || 0).toString(),
              ingredient.ingredient?.unit || '',
              (ingredient.ingredient?.price || 0).toString(),
              (ingredient.ingredient?.package_amount || 0).toString(),
              (Math.round(unitPrice * 100) / 100).toString(),
              (Math.round(usageCost * 100) / 100).toString()
            ]);
          });
        }
      });
    });

    const ingredientWs = utils.aoa_to_sheet(ingredientData);
    ingredientWs['!cols'] = [
      { width: 20 }, // 메뉴명
      { width: 20 }, // 용기명
      { width: 20 }, // 식재료명
      { width: 10 }, // 사용량
      { width: 8 },  // 단위
      { width: 12 }, // 식재료 단가
      { width: 10 }, // 포장량
      { width: 12 }, // 단위당 가격
      { width: 12 }  // 사용 원가
    ];
    utils.book_append_sheet(wb, ingredientWs, '메뉴식재료목록');

    // 엑셀 파일 생성
    const buffer = write(wb, { type: 'buffer', bookType: 'xlsx' });
    const companyName = company?.name || '회사';
    const fileName = `${companyName}_메뉴목록_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("메뉴 엑셀 다운로드 오류:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 