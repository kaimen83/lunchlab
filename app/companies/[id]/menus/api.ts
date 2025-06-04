import { Menu, ContainerDetailsResponse } from "./types";

// 페이지네이션 응답 타입 정의
export interface PaginatedMenusResponse {
  data: Menu[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    search?: string;
  };
}

/**
 * 메뉴 목록을 로드하는 함수 (페이지네이션 및 검색 지원)
 * @param companyId 회사 ID
 * @param page 페이지 번호 (기본값: 1)
 * @param limit 페이지당 항목 수 (기본값: 20)
 * @param search 검색어 (선택사항)
 * @returns 페이지네이션된 메뉴 목록 Promise
 */
export const loadMenus = async (
  companyId: string, 
  page: number = 1, 
  limit: number = 20,
  search?: string
): Promise<PaginatedMenusResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  const response = await fetch(
    `/api/companies/${companyId}/menus?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("메뉴 목록을 불러오는데 실패했습니다.");
  }

  const data = await response.json();
  return data as PaginatedMenusResponse;
};

/**
 * 모든 메뉴를 로드하는 함수 (기존 호환성을 위해 유지)
 * @param companyId 회사 ID
 * @returns 모든 메뉴 목록 Promise
 */
export const loadAllMenus = async (companyId: string): Promise<Menu[]> => {
  const allMenus: Menu[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await loadMenus(companyId, page, 100); // 한 번에 100개씩 로드
    allMenus.push(...response.data);
    
    hasMore = page < response.pagination.totalPages;
    page++;
  }

  return allMenus;
};

/**
 * 컨테이너 상세 정보를 로드하는 함수
 * @param companyId 회사 ID
 * @param containerId 컨테이너 ID
 * @returns 컨테이너 상세 정보 Promise
 */
export const loadContainerDetails = async (
  companyId: string,
  containerId: string
): Promise<ContainerDetailsResponse> => {
  const response = await fetch(`/api/companies/${companyId}/menus/details`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ container_id: containerId })
  });
  
  if (!response.ok) {
    throw new Error('컨테이너 상세 정보를 불러오는데 실패했습니다.');
  }
  
  const data = await response.json();
  return data as ContainerDetailsResponse;
};

/**
 * 메뉴를 삭제하는 함수
 * @param companyId 회사 ID
 * @param menuId 메뉴 ID
 * @returns 삭제 성공 여부 Promise
 */
export const deleteMenu = async (companyId: string, menuId: string): Promise<void> => {
  const response = await fetch(
    `/api/companies/${companyId}/menus/${menuId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const data = await response.json();

    // 식단 계획에서 사용 중인 경우 특별 처리
    if (response.status === 409) {
      throw new Error(
        data.error || "해당 메뉴가 식단 계획에서 사용 중입니다.",
      );
    }

    throw new Error(data.error || "메뉴 삭제에 실패했습니다.");
  }
}; 