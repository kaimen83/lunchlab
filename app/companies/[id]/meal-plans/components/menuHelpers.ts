import { Menu, MenuContainer } from './types';

export const getFilteredMenusForContainer = (
  containerId: string,
  menuContainers: MenuContainer[],
  menuSearchTerm: string
): Menu[] => {
  // 먼저 해당 용기와 연결된 모든 메뉴 조회
  const compatibleMenuContainers = menuContainers.filter(
    mc => mc.container_id === containerId
  );
  
  // 모든 메뉴 ID 추출
  const allMenuIds = Array.from(
    new Set(menuContainers.map(mc => mc.menu_id))
  );
  
  // 호환되는 메뉴 ID 추출
  const compatibleMenuIds = compatibleMenuContainers.map(mc => mc.menu_id);
  
  // 모든 메뉴를 가져오되, 검색어로 필터링하고 호환되는 메뉴를 우선 정렬
  return allMenuIds
    .map(menuId => {
      const menuContainer = menuContainers.find(mc => mc.menu_id === menuId);
      return menuContainer?.menu;
    })
    .filter((menu): menu is Menu => {
      if (!menu) return false;
      
      const nameMatch = menu.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
      const descriptionMatch = menu.description ? 
        menu.description.toLowerCase().includes(menuSearchTerm.toLowerCase()) : 
        false;
      
      return nameMatch || descriptionMatch;
    })
    .sort((a, b) => {
      const aIsCompatible = compatibleMenuIds.includes(a.id);
      const bIsCompatible = compatibleMenuIds.includes(b.id);
      
      if (aIsCompatible && !bIsCompatible) return -1;
      if (!aIsCompatible && bIsCompatible) return 1;
      return 0;
    });
};

// 용기 정보 가져오기
export const getContainerDetailsById = (
  containerId: string,
  containers: { id: string; name: string; description: string | null; price: number; }[]
) => {
  return containers.find(container => container.id === containerId);
};

// 메뉴 정보 가져오기
export const getMenuDetailsById = (
  menuId: string,
  menuContainers: MenuContainer[]
) => {
  const menuContainer = menuContainers.find(mc => mc.menu_id === menuId);
  return menuContainer?.menu;
}; 