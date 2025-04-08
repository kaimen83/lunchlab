import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import IngredientsList from '../ingredients/IngredientsList';
import MenusList from '../menus/MenusList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, BookOpen } from 'lucide-react';

interface InventoryPageProps {
  params: {
    id: string;
  };
  searchParams: { tab?: string };
}

export default async function InventoryPage({ params, searchParams }: InventoryPageProps) {
  const { id: companyId } = params;
  const { tab } = searchParams;
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  
  if (companyError || !company) {
    notFound();
  }
  
  // 멤버십 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();
  
  if (membershipError || !membership) {
    redirect(`/companies/${companyId}`);
  }
  
  // 식재료 및 메뉴 기능 활성화 여부 확인
  const { data: features, error: featuresError } = await supabase
    .from('company_features')
    .select('feature_name, is_enabled')
    .eq('company_id', companyId)
    .in('feature_name', ['ingredients', 'menus']);
  
  // 기능 데이터 로드 중 오류 발생 시 콘솔에 출력
  if (featuresError) {
    console.error('기능 로드 오류:', featuresError);
  }
  
  // features 배열이 비어있거나 null인 경우 확인
  const hasFeatures = features && features.length > 0;
  
  // ingredients와 menus 기능이 데이터베이스에 존재하는지 확인
  const ingredientsExists = hasFeatures && features.some(f => f.feature_name === 'ingredients');
  const menusExists = hasFeatures && features.some(f => f.feature_name === 'menus');
  
  // 테이블에서 누락된 기능이 있을 경우 콘솔에 로그 출력 및 누락된 기능 추가 시도
  if (!ingredientsExists || !menusExists) {
    const missingFeatures = [];
    
    if (!ingredientsExists) {
      console.log(`회사 ID ${companyId}에 ingredients 기능 정의가 누락되어 있습니다.`);
      missingFeatures.push({
        company_id: companyId,
        feature_name: 'ingredients',
        is_enabled: false
      });
    }
    
    if (!menusExists) {
      console.log(`회사 ID ${companyId}에 menus 기능 정의가 누락되어 있습니다.`);
      missingFeatures.push({
        company_id: companyId,
        feature_name: 'menus',
        is_enabled: false
      });
    }
    
    // 누락된 기능을 데이터베이스에 추가 시도
    if (missingFeatures.length > 0) {
      try {
        const { error: insertError } = await supabase
          .from('company_features')
          .insert(missingFeatures);
          
        if (insertError) {
          console.error('누락된 기능 추가 오류:', insertError);
        } else {
          console.log('누락된 기능이 성공적으로 추가되었습니다:', missingFeatures.map(f => f.feature_name).join(', '));
        }
      } catch (error) {
        console.error('누락된 기능 추가 중 예외 발생:', error);
      }
    }
  }
  
  // 기능이 활성화되어 있는지 확인
  const hasIngredientsFeature = hasFeatures && features.some(f => f.feature_name === 'ingredients' && f.is_enabled);
  const hasMenusFeature = hasFeatures && features.some(f => f.feature_name === 'menus' && f.is_enabled);
  
  // 두 기능이 모두 비활성화된 경우 설정 페이지로 리다이렉트
  if (!hasIngredientsFeature && !hasMenusFeature) {
    redirect(`/companies/${companyId}/settings`);
  }
  
  // 기본 탭 결정 - 활성화된 기능 기준
  const initialTab = tab || 
    (hasIngredientsFeature ? 'ingredients' : hasMenusFeature ? 'menus' : 'ingredients');
  
  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-gray-200 bg-white p-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">식자재/메뉴 관리</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="mb-4">
            {hasIngredientsFeature && (
              <TabsTrigger value="ingredients" className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                식재료
              </TabsTrigger>
            )}
            
            {hasMenusFeature && (
              <TabsTrigger value="menus" className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                메뉴
              </TabsTrigger>
            )}
          </TabsList>
          
          {hasIngredientsFeature && (
            <TabsContent value="ingredients">
              <IngredientsList companyId={companyId} userRole={membership.role} />
            </TabsContent>
          )}
          
          {hasMenusFeature && (
            <TabsContent value="menus">
              <MenusList companyId={companyId} userRole={membership.role} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
} 