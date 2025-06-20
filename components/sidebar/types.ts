import { Company } from '@/lib/types';
import { Dispatch, SetStateAction } from 'react';

// 컴포넌트 Props 정의
export interface CompanySidebarProps {
  companies: Array<Company & { role: string; features: CompanyFeatureData[] }>;
  isMobile?: boolean;
  isSheetOpen?: boolean;
  setIsSheetOpen?: (open: boolean) => void;
}

// 회사 기능 관련 타입
export type CompanyFeature = 'ingredients' | 'menus' | 'mealPlanning' | 'cookingPlan' | 'inventory';

interface CompanyFeatureData {
  feature_name: string;
  is_enabled: boolean;
}

// 사이드바 메뉴 항목 타입
export interface SidebarMenuItem {
  href: string;
  label: string;
  icon?: React.ComponentType<any>;
  badge?: number;
  isActive: boolean;
}

// 회사 정보와 기능 타입
export interface CompanyWithFeatures extends Company {
  role: string;
  features: CompanyFeatureData[];
  isCurrentCompany: boolean;
  isExpanded: boolean;
  requestCount: number;
  isAdmin: boolean;
  hasIngredientsFeature: boolean;
  hasMenusFeature: boolean;
  hasMealPlanningFeature: boolean;
  hasCookingPlanFeature: boolean;
  hasInventoryFeature: boolean;
  navigationInProgress: string | null;
  navigateToTab?: (url: string) => void;
} 