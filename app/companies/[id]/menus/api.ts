import { Menu, ContainerDetailsResponse } from "./types";

/**
 * 메뉴 목록을 로드하는 함수
 * @param companyId 회사 ID
 * @returns 메뉴 목록 Promise
 */
export const loadMenus = async (companyId: string): Promise<Menu[]> => {
  const response = await fetch(`/api/companies/${companyId}/menus`);

  if (!response.ok) {
    throw new Error("메뉴 목록을 불러오는데 실패했습니다.");
  }

  const data = await response.json();
  return data as Menu[];
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