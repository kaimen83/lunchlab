import { Container, TopIngredient } from "./types";

/**
 * 금액을 한국어 통화 형식으로 포맷팅하는 함수
 * 통화 기호 없이 숫자만 표시하고 마지막에 '원'을 추가합니다.
 * @param amount 포맷팅할 금액
 * @returns 포맷팅된 문자열
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ko-KR", {
    style: "decimal",
    maximumFractionDigits: 0
  }).format(amount) + "원";
};

/**
 * 메뉴에서 가장 비싼 상위 식재료를 추출하는 함수
 * @param containers 용기 배열
 * @returns 가장 비싼 상위 3개 식재료
 */
export const getTopIngredients = (containers: Container[] | undefined): TopIngredient[] => {
  if (!containers || containers.length === 0) return [];

  // 모든 용기의 식자재를 하나의 배열로 평탄화
  const allIngredients = containers.flatMap(
    (container) => container.ingredients,
  );

  // 식자재별 총 원가 계산
  const ingredientCosts: TopIngredient[] = [];
  allIngredients.forEach((item) => {
    const unitPrice = item.ingredient.price / item.ingredient.package_amount;
    const itemCost = unitPrice * item.amount;

    const existingIdx = ingredientCosts.findIndex(
      (i) => i.name === item.ingredient.name,
    );
    if (existingIdx >= 0) {
      ingredientCosts[existingIdx].cost += itemCost;
    } else {
      ingredientCosts.push({
        name: item.ingredient.name,
        cost: itemCost,
      });
    }
  });

  // 원가가 높은 순으로 정렬하고 상위 3개 반환
  return ingredientCosts.sort((a, b) => b.cost - a.cost).slice(0, 3);
}; 