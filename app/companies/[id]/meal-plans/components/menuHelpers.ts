import { Menu, MenuContainer } from './types';

export const getFilteredMenusForContainer = (
  containerId: string,
  menuContainers: MenuContainer[],
  menuSearchTerm: string
): Menu[] => {
  // 해당 용기와 연결된 모든 메뉴 조회
  const compatibleMenuContainers = menuContainers.filter(
    mc => mc.container_id === containerId
  );
  
  // 호환되는 메뉴 ID 추출
  const compatibleMenuIds = compatibleMenuContainers.map(mc => mc.menu_id);
  
  // 호환되는 메뉴만 가져오고, 검색어로 필터링
  return compatibleMenuIds
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
    .sort((a, b) => a.name.localeCompare(b.name)); // 이름순 정렬
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