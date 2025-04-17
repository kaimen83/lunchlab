import { Company } from '@/lib/types';
import { Dispatch, SetStateAction } from 'react';

// 컴포넌트 Props 정의
export interface CompanySidebarProps {
  companies: Array<Company & { role: string }>;
  isMobile?: boolean;
  isSheetOpen?: boolean;
  setIsSheetOpen?: Dispatch<SetStateAction<boolean>>;
}

// 회사 기능 관련 타입
export type CompanyFeature = 'ingredients' | 'menus' | 'settings' | 'mealPlanning' | 'cookingPlan';

// 사이드바 메뉴 항목 타입
export interface SidebarMenuItem {
  href: string;
  label: string;
  icon?: React.ComponentType<any>;
  badge?: number;
  isActive: boolean;
}

// 회사 정보와 기능 타입
export interface CompanyWithFeatures {
  id: string;
  name: string;
  role: string;
  isCurrentCompany: boolean;
  isExpanded: boolean;
  requestCount: number;
  isAdmin: boolean;
  hasIngredientsFeature: boolean;
  hasMenusFeature: boolean;
  hasMealPlanningFeature: boolean;
  hasCookingPlanFeature: boolean;
  // 낙관적 UI 업데이트를 위한 추가 속성
  navigationInProgress?: string | null;
  navigateToTab?: (url: string) => void;
} 