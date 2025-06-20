// 기능 누락 체크 및 자동 추가를 위한 백그라운드 유틸리티

const REQUIRED_FEATURES = ['ingredients', 'menus', 'mealPlanning', 'cookingPlan', 'inventory'];

interface CompanyFeature {
  feature_name: string;
  is_enabled: boolean;
}

/**
 * 회사의 누락된 필수 기능들을 백그라운드에서 자동 추가
 */
export async function ensureRequiredFeatures(companyId: string, existingFeatures: CompanyFeature[]) {
  try {
    const enabledFeatureNames = existingFeatures
      .filter(f => f.is_enabled)
      .map(f => f.feature_name);
    
    const missingFeatures = REQUIRED_FEATURES.filter(
      featureName => !enabledFeatureNames.includes(featureName)
    );
    
    if (missingFeatures.length === 0) {
      return;
    }
    
    // 백그라운드에서 누락된 기능들 추가 (비동기, 에러 무시)
    Promise.all(
      missingFeatures.map(async (featureName) => {
        try {
          await fetch(`/api/companies/${companyId}/features`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              featureName,
              isEnabled: true
            })
          });
          console.log(`기능 ${featureName}이 회사 ${companyId}에 자동 추가됨`);
        } catch (error) {
          console.warn(`기능 ${featureName} 자동 추가 실패:`, error);
        }
      })
    ).catch(() => {
      // 전체 작업이 실패해도 무시 (백그라운드 작업이므로)
    });
    
  } catch (error) {
    console.warn('필수 기능 체크 중 오류:', error);
  }
}

/**
 * 사용자 회사 목록에 대해 백그라운드에서 필수 기능 체크 수행
 */
export function checkMissingFeaturesInBackground(companies: Array<{ id: string; features: CompanyFeature[] }>) {
  // 페이지 로드 후 2초 뒤에 백그라운드에서 실행
  setTimeout(() => {
    companies.forEach(company => {
      ensureRequiredFeatures(company.id, company.features);
    });
  }, 2000);
} 