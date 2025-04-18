'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import CookingPlanResult from '../components/CookingPlanResult';
import { CookingPlan } from '../types';
import * as XLSX from 'xlsx';

interface CookingPlanClientWrapperProps {
  cookingPlan: CookingPlan;
}

// 메뉴 인터페이스 추가
interface Menu {
  id: string;
  name: string;
  description?: string;
  menu_price_history?: any[];
  menu_containers?: MenuContainer[];
}

// 메뉴-용기-식재료 관계 타입 정의
interface MenuContainerIngredient {
  amount: number;
  ingredient: {
    id: string;
    name: string;
    package_amount: number;
    unit: string;
    price: number;
    code_name?: string;
  }
}

// 메뉴-용기-식재료 정보를 포함한 메뉴 컨테이너 타입 정의
interface MenuContainer {
  id: string;
  menu_id: string;
  container_id: string;
  ingredients_cost: number;
  menu_container_ingredients?: MenuContainerIngredient[];
  container?: {
    id: string;
    name: string;
  };
}

export default function CookingPlanClientWrapper({ cookingPlan }: CookingPlanClientWrapperProps) {
  const { toast } = useToast();
  // 현재 활성화된 탭 상태 관리
  const [activeTab, setActiveTab] = useState<'menu-portions' | 'ingredients'>('menu-portions');
  
  // 인쇄 처리
  const handlePrint = () => {
    window.print();
  };

  // 메뉴 식단별 식수 탭 데이터로 엑셀 생성
  const generateMenuPortionsExcel = () => {
    // 결과 데이터를 저장할 배열
    const excelData: any[] = [];
    
    // 식사 시간별로 그룹화
    const menusByMealTime = cookingPlan.menu_portions.reduce((acc, menu) => {
      const mealTime = menu.meal_time || '기타';
      if (!acc[mealTime]) {
        acc[mealTime] = [];
      }
      acc[mealTime].push(menu);
      return acc;
    }, {} as Record<string, typeof cookingPlan.menu_portions>);
    
    // 각 식사 시간별 데이터를 엑셀에 추가
    Object.entries(menusByMealTime).forEach(([mealTime, menus]) => {
      // 식사 시간 한글화
      const mealTimeName = getMealTimeName(mealTime);
      
      // 식사 시간 구분 행 추가
      excelData.push([`${mealTimeName} 식단`]);
      
      // 헤더 행 추가
      excelData.push(['메뉴명', '용기', '사용 식단', '식수', '필요 식재료', '품목코드', '식재료 양', '포장단위', '투입량']);
      
      // 식단 데이터 처리
      const processedMenus = processMenuData(menus, mealTime);
      
      // 메뉴 데이터 추가
      processedMenus.forEach(menuPortion => {
        if (menuPortion.ingredients && menuPortion.ingredients.length > 0) {
          // 식재료 정보가 있는 경우
          menuPortion.ingredients.forEach((ingredient, idx) => {
            // 해당 식재료의 포장단위 정보 찾기
            const ingredientReq = cookingPlan.ingredient_requirements.find(
              item => item.ingredient_id === ingredient.id
            );
            
            // 포장단위 정보 가져오기
            const packageAmount = ingredientReq?.package_amount;
            
            // 투입량 계산 (필요 수량 / 포장단위)
            const unitsRequired = packageAmount ? 
              (ingredient.amount / packageAmount).toFixed(1) : 
              "-";
              
            // 메뉴 정보는 첫 번째 행에만 추가
            if (idx === 0) {
              excelData.push([
                menuPortion.menu_name,
                menuPortion.container_names.join(', '),
                getMealPlanNames(menuPortion.mealPlans),
                formatHeadcounts(menuPortion.containers_info),
                ingredient.name,
                ingredientReq?.code_name || "-",
                `${formatAmount(ingredient.amount)} ${ingredient.unit}`,
                packageAmount ? `${packageAmount} ${ingredient.unit}` : "-",
                unitsRequired
              ]);
            } else {
              // 두 번째 행부터는 메뉴 정보는 빈칸으로 처리
              excelData.push([
                '', '', '', '',
                ingredient.name,
                ingredientReq?.code_name || "-",
                `${formatAmount(ingredient.amount)} ${ingredient.unit}`,
                packageAmount ? `${packageAmount} ${ingredient.unit}` : "-",
                unitsRequired
              ]);
            }
          });
        } else {
          // 식재료 정보가 없는 경우
          excelData.push([
            menuPortion.menu_name,
            menuPortion.container_names.join(', '),
            getMealPlanNames(menuPortion.mealPlans),
            formatHeadcounts(menuPortion.containers_info),
            '등록된 식재료 정보가 없습니다.', '', '', '', ''
          ]);
        }
      });
      
      // 빈 행 추가 (구분용)
      excelData.push(['']);
    });
    
    // 주석 행 추가
    excelData.push(['* 식재료 수량은 각 메뉴의 식수에 맞게 계산된 값입니다.']);
    excelData.push(['* 포장단위는 식재료 마스터에 등록된 정보입니다. 정보가 없는 경우 "-"로 표시됩니다.']);
    excelData.push(['* 투입량은 필요 수량을 포장단위로 나눈 값입니다. 포장단위가 없으면 계산할 수 없습니다.']);
    
    return excelData;
  };

  // 필요 식재료 탭 데이터로 엑셀 생성
  const generateIngredientsExcel = () => {
    const excelData: any[] = [];
    
    // 총 원가 계산
    const totalIngredientsCost = cookingPlan.ingredient_requirements.reduce(
      (sum, item) => sum + item.total_price, 0
    );
    
    // 헤더 행 추가
    excelData.push(['필요 식재료 목록']);
    excelData.push([`총 ${cookingPlan.ingredient_requirements.length}개 품목 / 예상 원가: ${formatCurrency(totalIngredientsCost)}`]);
    excelData.push(['']);
    excelData.push(['식재료명', '품목코드', '필요 수량', '포장단위', '투입량', '단가', '총 원가']);
    
    // 식재료 데이터 추가
    cookingPlan.ingredient_requirements.forEach(item => {
      // 식재료 포장단위 정보 가져오기
      const packageAmount = item.package_amount;
      
      // 투입량 계산 (필요 수량 / 포장단위)
      const unitsRequired = packageAmount ? 
        (item.total_amount / packageAmount).toFixed(1) : 
        "-";
      
      excelData.push([
        item.ingredient_name,
        item.code_name || "-",
        `${formatAmount(item.total_amount)} ${item.unit}`,
        packageAmount ? `${packageAmount} ${item.unit}` : "-",
        unitsRequired,
        formatUnitPrice(item.unit_price, item.unit),
        formatCurrency(item.total_price)
      ]);
    });
    
    // 주석 행 추가
    excelData.push(['']);
    excelData.push(['* 포장단위는 식재료 마스터에 등록된 정보입니다. 정보가 없는 경우 "-"로 표시됩니다.']);
    excelData.push(['* 투입량은 필요 수량을 포장단위로 나눈 값입니다. 포장단위가 없으면 계산할 수 없습니다.']);
    
    return excelData;
  };

  // 엑셀 다운로드 처리
  const handleDownload = () => {
    try {
      let excelData: any[] = [];
      let fileName = '';
      
      // 현재 활성화된 탭에 따라 다운로드할 데이터 결정
      if (activeTab === 'menu-portions') {
        excelData = generateMenuPortionsExcel();
        fileName = `조리계획서_식단별식수_${cookingPlan.date}.xlsx`;
      } else {
        excelData = generateIngredientsExcel();
        fileName = `조리계획서_필요식재료_${cookingPlan.date}.xlsx`;
      }
      
      // 워크시트 생성
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // 엑셀 파일 다운로드
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: '다운로드 완료',
        description: '조리계획서 파일이 다운로드되었습니다.',
      });
    } catch (error) {
      console.error('다운로드 오류:', error);
      toast({
        title: '다운로드 실패',
        description: '파일 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 메뉴 데이터 처리 (CookingPlanResult 파일에서 가져온 로직을 일부 간소화)
  const processMenuData = (menus: typeof cookingPlan.menu_portions, mealTime: string) => {
    // 메뉴별로 그룹화 (동일 메뉴명은 같은 행으로 통합)
    const menuMap = new Map<string, {
      menu: typeof cookingPlan.menu_portions[0],
      containers: Map<string, {
        headcount: number, 
        containerName: string | null,
        mealPlans: Set<string>,
        ingredients: {
          id: string;
          name: string;
          amount: number;
          unit: string;
        }[] | undefined
      }>
    }>();
    
    menus.forEach(menu => {
      const menuName = menu.menu_name;
      
      // 동일 메뉴가 있는지 확인
      if (menuMap.has(menuName)) {
        const existingMenu = menuMap.get(menuName)!;
        
        // 해당 용기가 있는지 확인
        const containerKey = menu.container_id || 'null';
        
        if (existingMenu.containers.has(containerKey)) {
          // 기존 용기에 식수 추가
          const container = existingMenu.containers.get(containerKey)!;
          container.headcount += menu.headcount;
          
          // 식단 정보 추가 (meal_plan_id가 있을 경우)
          if (menu.meal_plan_id) {
            container.mealPlans.add(menu.meal_plan_id);
          }
        } else {
          // 새 용기 추가
          const ingredients = getMenuIngredients(menu.menu_id, menu.container_id || null);
          
          existingMenu.containers.set(containerKey, {
            headcount: menu.headcount,
            containerName: menu.container_name ?? null, // undefined이면 null로 처리
            mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set(),
            ingredients
          });
        }
      } else {
        // 새 메뉴 추가
        const ingredients = getMenuIngredients(menu.menu_id, menu.container_id || null);
        
        const containers = new Map();
        
        containers.set(menu.container_id || 'null', {
          headcount: menu.headcount,
          containerName: menu.container_name ?? null, // undefined이면 null로 처리
          mealPlans: menu.meal_plan_id ? new Set([menu.meal_plan_id]) : new Set(),
          ingredients
        });
        
        menuMap.set(menuName, {
          menu: {...menu},
          containers
        });
      }
    });
    
    // 통합된 메뉴 목록 생성
    return Array.from(menuMap.entries()).map(([menuName, item]) => {
      // 용기별 정보 생성
      const containers = Array.from(item.containers.values());
      const containersInfo = containers.map(container => ({
        name: container.containerName || '기본',
        headcount: container.headcount
      }));
      
      // 용기명 목록
      const containerNames: string[] = [];
      containers.forEach(container => {
        if (container.containerName) {
          containerNames.push(container.containerName);
        }
      });
      
      // 식단 ID 목록
      const mealPlanIds = Array.from(
        new Set(
          containers.flatMap(container => 
            Array.from(container.mealPlans)
          )
        )
      );
      
      // 식재료 목록 취합 (중복 식재료는 수량 합산)
      const ingredientMap = new Map();
      
      containers.forEach(container => {
        if (container.ingredients && container.ingredients.length > 0) {
          container.ingredients.forEach(ingredient => {
            const key = ingredient.id;
            
            if (ingredientMap.has(key)) {
              // 기존 식재료가 있으면 수량 합산
              const existingIngredient = ingredientMap.get(key);
              existingIngredient.amount += ingredient.amount * container.headcount;
            } else {
              // 새 식재료 추가
              ingredientMap.set(key, {
                ...ingredient,
                containerName: container.containerName,
                headcount: container.headcount,
                amount: ingredient.amount * container.headcount
              });
            }
          });
        }
      });
      
      // 합산된 식재료 목록으로 변환
      const allIngredients = Array.from(ingredientMap.values());
      
      // 전체 식수 계산
      const totalHeadcount = containers.reduce((sum, container) => sum + container.headcount, 0);
      
      return {
        ...item.menu,
        menu_name: menuName,
        container_names: containerNames,
        containers_info: containersInfo,
        headcount: totalHeadcount,
        mealPlans: mealPlanIds,
        ingredients: allIngredients
      };
    });
  };

  // 메뉴 식재료 정보 가져오기
  const getMenuIngredients = (menuId: string, containerId: string | null) => {
    // 해당 메뉴의 메뉴-용기 조합을 찾기 위해 meal_plans의 모든 메뉴를 검색
    for (const mealPlan of cookingPlan.meal_plans) {
      // meal_plan_menus가 없는 경우 스킵
      if (!mealPlan.meal_plan_menus) continue;
      
      for (const mealPlanMenu of mealPlan.meal_plan_menus) {
        const menu = mealPlanMenu.menu as Menu;
        // 해당 메뉴인지 확인
        if (menu.id === menuId) {
          // menu_containers가 없는 경우 스킵
          if (!menu.menu_containers) continue;
          
          // 해당 용기에 맞는 menu_container 찾기
          const menuContainer = menu.menu_containers.find(
            (mc: MenuContainer) => mc.menu_id === menuId && mc.container_id === containerId
          ) as MenuContainer;
          
          if (menuContainer && menuContainer.menu_container_ingredients) {
            // 식재료 정보 추출
            return menuContainer.menu_container_ingredients.map((item: MenuContainerIngredient) => ({
              id: item.ingredient.id,
              name: item.ingredient.name,
              amount: item.amount,
              unit: item.ingredient.unit
            }));
          }
        }
      }
    }
    return [];
  };

  // 식사 시간 한글화
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return mealTime;
    }
  };

  // 금액 포맷
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('₩', '') + '원';
  };

  // 단가 포맷 (원/단위 형태로 표시)
  const formatUnitPrice = (unitPrice: number, unit: string) => {
    // 통화 형식으로 포맷
    const formattedPrice = new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(unitPrice).replace('₩', '');
    
    // 단위 추가 (예: "1,000원/g")
    return `${formattedPrice}원/${unit}`;
  };

  // 수량 포맷
  const formatAmount = (amount: number) => {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
  };

  // 식단 ID를 식단명으로 변환하는 함수
  const getMealPlanNames = (mealPlanIds: string[]) => {
    if (!mealPlanIds.length) return '-';
    
    // 식단 ID에 해당하는 식단 찾기
    const mealPlanNames = mealPlanIds.map(id => {
      const mealPlan = cookingPlan.meal_plans.find(mp => mp.id === id);
      return mealPlan?.name || id;
    });
    
    return mealPlanNames.join(', ');
  };

  // 식수 포맷 (용기별로 구분)
  const formatHeadcounts = (containersInfo: {name: string, headcount: number}[]) => {
    // 용기가 하나인 경우 식수만 표시
    if (containersInfo.length === 1) {
      return `${containersInfo[0].headcount}명`;
    }
    
    // 용기가 여러 개인 경우 '용기명: 식수' 형식으로 표시
    return containersInfo.map(info => `${info.name}: ${info.headcount}명`).join(', ');
  };

  return (
    <CookingPlanResult 
      cookingPlan={cookingPlan} 
      onPrint={handlePrint} 
      onDownload={handleDownload}
      onTabChange={(value: string) => setActiveTab(value as 'menu-portions' | 'ingredients')}
      activeTab={activeTab}
    />
  );
} 