import { createServerSupabaseClient } from '@/lib/supabase';
import { getCompanyModules, getModuleMenuItems } from '@/lib/marketplace/queries';
import { Company, MarketplaceModule, ModuleMenuItem } from '@/lib/types';

/**
 * 회사별로 구독한 모든 모듈의 메뉴 아이템을 가져오는 함수
 */
export async function getCompaniesModuleMenus(companyIds: string[]) {
  try {
    const result: {
      [companyId: string]: (MarketplaceModule & { 
        menuItems: ModuleMenuItem[];
      })[];
    } = {};
    
    // 각 회사에 대해 모듈 및 메뉴 아이템 가져오기
    await Promise.all(
      companyIds.map(async (companyId) => {
        // 회사가 구독한 활성화된 모듈 목록 가져오기
        const { modules, error: modulesError } = await getCompanyModules(companyId);
        
        if (modulesError) {
          console.error(`회사 ${companyId}의 모듈 목록 조회 오류:`, modulesError);
          result[companyId] = [];
          return;
        }
        
        // 활성화된 모듈만 필터링
        const activeModules = modules.filter(module => module.subscription_status === 'active');
        
        // 각 모듈의 메뉴 아이템 조회
        const modulesWithMenuItems = await Promise.all(
          activeModules.map(async (module) => {
            const { menuItems, error: menuError } = await getModuleMenuItems(module.id);
            
            if (menuError) {
              console.error(`모듈 ${module.id}의 메뉴 아이템 조회 오류:`, menuError);
              return {
                ...module,
                menuItems: []
              };
            }
            
            return {
              ...module,
              menuItems
            };
          })
        );
        
        result[companyId] = modulesWithMenuItems;
      })
    );
    
    return { companyModules: result, error: null };
  } catch (error) {
    console.error('모듈 메뉴 아이템 조회 오류:', error);
    return { 
      companyModules: {},
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
} 