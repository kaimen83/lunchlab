'use client';

import IngredientsList from '../ingredients/IngredientsList';
import MenusList from '../menus/MenusList';
import ContainersList from '../menus/components/ContainersList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, BookOpen, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyMemberRole } from '@/lib/types';

interface InventoryClientProps {
  companyId: string;
  userRole: CompanyMemberRole;
  hasIngredientsFeature: boolean;
  hasMenusFeature: boolean;
  initialTab: string;
}

export default function InventoryClient({
  companyId,
  userRole,
  hasIngredientsFeature,
  hasMenusFeature,
  initialTab
}: InventoryClientProps) {
  // 엑셀 다운로드 함수
  const handleExcelDownload = (type: 'ingredients' | 'containers' | 'menus') => {
    const url = `/api/companies/${companyId}/inventory/${type}/export`;
    window.open(url, '_blank');
  };

  return (
    <main className="flex-1 overflow-y-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="mb-4 w-full sm:w-auto">
            {hasIngredientsFeature && (
              <TabsTrigger value="ingredients" className="flex-1 sm:flex-initial items-center">
                <ClipboardList className="h-4 w-4 mr-2 hidden sm:inline" />
                <ClipboardList className="h-4 w-4 sm:hidden mb-1" />
                <span className="text-xs sm:text-sm">식재료</span>
              </TabsTrigger>
            )}
            
            {hasMenusFeature && (
              <TabsTrigger value="menus" className="flex-1 sm:flex-initial items-center">
                <BookOpen className="h-4 w-4 mr-2 hidden sm:inline" />
                <BookOpen className="h-4 w-4 sm:hidden mb-1" />
                <span className="text-xs sm:text-sm">메뉴</span>
              </TabsTrigger>
            )}

            {hasMenusFeature && (
              <TabsTrigger value="containers" className="flex-1 sm:flex-initial items-center">
                <Package className="h-4 w-4 mr-2 hidden sm:inline" />
                <Package className="h-4 w-4 sm:hidden mb-1" />
                <span className="text-xs sm:text-sm">용기설정</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          {hasIngredientsFeature && (
            <TabsContent value="ingredients">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">식재료 관리</h2>
                  <Button 
                    onClick={() => handleExcelDownload('ingredients')} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                </div>
                <IngredientsList companyId={companyId} userRole={userRole} />
              </div>
            </TabsContent>
          )}
          
          {hasMenusFeature && (
            <TabsContent value="menus">
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">메뉴 관리</h2>
                  <Button 
                    onClick={() => handleExcelDownload('menus')} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                </div>
                <p className="text-muted-foreground mb-6 hidden sm:block">
                  식당에서 제공하는 메뉴를 등록하고 관리하세요. 등록된 메뉴는 식단 계획과 원가 관리에 활용됩니다.
                </p>
                <MenusList companyId={companyId} userRole={userRole} />
              </div>
            </TabsContent>
          )}

          {hasMenusFeature && (
            <TabsContent value="containers">
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">용기 관리</h2>
                  <Button 
                    onClick={() => handleExcelDownload('containers')} 
                    variant="outline" 
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    엑셀 다운로드
                  </Button>
                </div>
                <p className="text-muted-foreground mb-6 hidden sm:block">
                  메뉴에 사용할 용기를 등록하고 관리하세요. 용기 정보는 원가 계산과 메뉴 구성에 활용됩니다.
                </p>
                <ContainersList companyId={companyId} userRole={userRole} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
} 