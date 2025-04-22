/**
 * 로컬 스토리지에서 최근 사용 식재료 목록을 가져옵니다.
 */
export const getRecentIngredients = (companyId: string): string[] => {
  if (typeof window === 'undefined') return [];
  
  const key = `recent-ingredients-${companyId}`;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : [];
};

/**
 * 새로운 식재료를 최근 사용 목록에 추가합니다.
 * 이미 있는 경우 맨 앞으로 이동시키고, 최대 5개까지만 유지합니다.
 */
export const addRecentIngredient = (companyId: string, ingredientId: string): void => {
  if (typeof window === 'undefined') return;
  
  const key = `recent-ingredients-${companyId}`;
  const recent = getRecentIngredients(companyId);
  
  // 이미 있으면 제거 후 맨 앞에 추가
  const filtered = recent.filter(id => id !== ingredientId);
  filtered.unshift(ingredientId);
  
  // 최대 5개만 유지
  const updated = filtered.slice(0, 5);
  localStorage.setItem(key, JSON.stringify(updated));
}; 