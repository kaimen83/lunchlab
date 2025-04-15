import { Menu, MenuContainer } from './types';

// 메뉴가 다른 용기와 호환되는지 확인하는 헬퍼 함수
const hasCompatibleContainers = (
  menuId: string,
  currentContainerId: string,
  menuContainers: MenuContainer[]
): boolean => {
  return menuContainers.some(mc => 
    mc.menu_id === menuId && 
    mc.container_id !== currentContainerId && 
    mc.total_cost > 0
  );
};

export const getFilteredMenusForContainer = (
  containerId: string,
  menuContainers: MenuContainer[],
  menuSearchTerm: string
): Menu[] => {
  // 먼저 해당 용기와 연결된 모든 메뉴 조회
  const compatibleMenuContainers = menuContainers.filter(
    mc => mc.container_id === containerId
  );
  
  // 모든 메뉴 ID 추출 (모든 메뉴 사용 가능)
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
      // 1. 현재 용기와 호환되는 메뉴를 가장 먼저 표시
      const aIsCompatible = compatibleMenuIds.includes(a.id);
      const bIsCompatible = compatibleMenuIds.includes(b.id);
      
      if (aIsCompatible && !bIsCompatible) return -1;
      if (!aIsCompatible && bIsCompatible) return 1;
      
      // 2. 둘 다 호환되면 이름순 정렬
      if (aIsCompatible && bIsCompatible) {
        return a.name.localeCompare(b.name);
      }
      
      // 3. 둘 다 호환되지 않는 경우, 다른 용기와 호환되는 메뉴 우선
      const aCompatibleWithOthers = hasCompatibleContainers(a.id, containerId, menuContainers);
      const bCompatibleWithOthers = hasCompatibleContainers(b.id, containerId, menuContainers);
      
      if (aCompatibleWithOthers && !bCompatibleWithOthers) return -1;
      if (!aCompatibleWithOthers && bCompatibleWithOthers) return 1;
      
      // 4. 그 외에는 이름순 정렬
      return a.name.localeCompare(b.name);
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