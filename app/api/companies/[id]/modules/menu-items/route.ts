import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getCompanyModules, getModuleMenuItems } from '@/lib/marketplace/queries';

// 회사의 모든 모듈에 대한 메뉴 아이템을 가져오는 API
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // params는 Promise이므로 await로 처리
    const { id: companyId } = await context.params;
    
    // 회사가 구독한 활성화된 모듈 목록 가져오기
    const { modules, error: modulesError } = await getCompanyModules(companyId);
    
    if (modulesError) {
      console.error('모듈 목록 조회 오류:', modulesError);
      return NextResponse.json(
        { error: '모듈 목록을 조회할 수 없습니다.' }, 
        { status: 500 }
      );
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
    
    return NextResponse.json({ modules: modulesWithMenuItems });
  } catch (error) {
    console.error('모듈 메뉴 아이템 조회 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 