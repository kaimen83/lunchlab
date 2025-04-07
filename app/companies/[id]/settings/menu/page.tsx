import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { checkUserCompanyAccess } from "@/lib/supabase-queries";
import { getCompanyModules, getModuleMenuItems, getCompanyMenuSettings } from "@/lib/marketplace/queries";
import MenuSettingsForm from "./MenuSettingsForm";

export const metadata = {
  title: '메뉴 설정 - 런치랩',
};

interface MenuSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MenuSettingsPage({ params }: MenuSettingsPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // params는 Promise이므로 await로 처리
  const { id: companyId } = await params;
  
  // 사용자의 회사 접근 권한 확인
  const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
  
  if (accessError || !role) {
    notFound();
  }
  
  // 관리자 또는 소유자만 접근 가능
  if (role !== 'owner' && role !== 'admin') {
    redirect(`/companies/${companyId}`);
  }
  
  // 회사가 구독한 모듈 목록 조회
  const { modules, error: modulesError } = await getCompanyModules(companyId);
  
  if (modulesError) {
    console.error('모듈 목록 조회 오류:', modulesError);
  }
  
  // 활성화된 모듈만 필터링
  const activeModules = modules.filter(module => module.subscription_status === 'active');
  
  // 각 모듈의 메뉴 아이템과 설정 조회
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
  
  // 회사의 메뉴 설정 조회
  const { menuSettings, error: settingsError } = await getCompanyMenuSettings(companyId);
  
  if (settingsError) {
    console.error('메뉴 설정 조회 오류:', settingsError);
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">메뉴 설정</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          회사 사이드바에 표시될 메뉴 항목을 설정하고 순서를 조정할 수 있습니다.
        </p>
        
        <MenuSettingsForm 
          companyId={companyId}
          modules={modulesWithMenuItems}
          menuSettings={menuSettings}
        />
      </div>
    </div>
  );
} 