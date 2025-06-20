'use client';

import { useEffect } from 'react';
import { checkMissingFeaturesInBackground } from '@/lib/feature-utils';

interface CompanyFeature {
  feature_name: string;
  is_enabled: boolean;
}

interface Company {
  id: string;
  features: CompanyFeature[];
}

interface BackgroundFeatureCheckerProps {
  companies: Company[];
}

export function BackgroundFeatureChecker({ companies }: BackgroundFeatureCheckerProps) {
  useEffect(() => {
    if (companies && companies.length > 0) {
      checkMissingFeaturesInBackground(companies);
    }
  }, [companies]);

  return null; // 렌더링되지 않는 유틸리티 컴포넌트
} 