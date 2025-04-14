import { MenuContainer } from './types';

// 특정 메뉴가 특정 용기와 호환되는지 확인
export const isMenuCompatibleWithContainer = (
  menuId: string, 
  containerId: string,
  menuContainers: MenuContainer[]
) => {
  return menuContainers.some(mc => 
    mc.menu_id === menuId && mc.container_id === containerId
  );
};

// 원가 정보 가져오기
export const getCostInfoForMenuAndContainer = (
  menuId: string, 
  containerId: string,
  menuContainers: MenuContainer[]
) => {
  const menuContainer = menuContainers.find(
    mc => mc.menu_id === menuId && mc.container_id === containerId
  );
  
  if (!menuContainer) {
    return {
      ingredients_cost: 0,
      total_cost: 0
    };
  }
  
  return {
    ingredients_cost: menuContainer.ingredients_cost,
    total_cost: menuContainer.total_cost
  };
};

// 포맷된 가격 표시
export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR', { 
    style: 'currency', 
    currency: 'KRW',
    maximumFractionDigits: 1
  }).format(price);
}; 