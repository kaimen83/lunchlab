'use client';

import { useState } from 'react';
import { MarketplaceModule, ModuleMenuItem, CompanyMenuSetting } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface MenuSettingsFormProps {
  companyId: string;
  modules: (MarketplaceModule & { menuItems: ModuleMenuItem[] })[];
  menuSettings: CompanyMenuSetting[];
}

export default function MenuSettingsForm({ companyId, modules, menuSettings }: MenuSettingsFormProps) {
  // 메뉴 설정을 menu_item_id를 키로 하는 맵으로 변환
  const menuSettingsMap = menuSettings.reduce((map, setting) => {
    map[setting.menu_item_id] = setting;
    return map;
  }, {} as Record<string, CompanyMenuSetting>);
  
  // 각 모듈의 메뉴 아이템에 대한 상태 초기화
  const [moduleMenuState, setModuleMenuState] = useState<Record<string, {
    visible: boolean;
    order: number;
  }>>(() => {
    const initialState: Record<string, { visible: boolean; order: number }> = {};
    
    // 모든 모듈의 메뉴 아이템을 순회하며 초기 상태 설정
    modules.forEach(module => {
      module.menuItems.forEach(menuItem => {
        const setting = menuSettingsMap[menuItem.id];
        initialState[menuItem.id] = {
          visible: setting ? setting.is_visible : true,
          order: setting?.display_order ?? menuItem.display_order
        };
      });
    });
    
    return initialState;
  });
  
  // 메뉴 아이템 가시성 변경 핸들러
  const handleVisibilityChange = async (menuItemId: string, visible: boolean) => {
    try {
      // 상태 업데이트
      setModuleMenuState(prev => ({
        ...prev,
        [menuItemId]: {
          ...prev[menuItemId],
          visible
        }
      }));
      
      // API 호출하여 설정 저장
      const response = await fetch(`/api/companies/${companyId}/menu-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menuItemId,
          isVisible: visible,
          displayOrder: moduleMenuState[menuItemId].order
        })
      });
      
      if (!response.ok) {
        throw new Error('메뉴 설정을 저장하는 중 오류가 발생했습니다.');
      }
      
      toast.success('메뉴 설정이 저장되었습니다.');
    } catch (error) {
      console.error('메뉴 설정 저장 오류:', error);
      toast.error('메뉴 설정을 저장하는 중 오류가 발생했습니다.');
      
      // 오류 발생 시 이전 상태로 롤백
      setModuleMenuState(prev => ({
        ...prev,
        [menuItemId]: {
          ...prev[menuItemId],
          visible: !visible
        }
      }));
    }
  };
  
  // 메뉴 아이템 순서 변경 핸들러
  const handleOrderChange = async (menuItemId: string, direction: 'up' | 'down') => {
    try {
      // 현재 순서
      const currentOrder = moduleMenuState[menuItemId].order;
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      
      // 상태 업데이트
      setModuleMenuState(prev => ({
        ...prev,
        [menuItemId]: {
          ...prev[menuItemId],
          order: newOrder
        }
      }));
      
      // API 호출하여 설정 저장
      const response = await fetch(`/api/companies/${companyId}/menu-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menuItemId,
          isVisible: moduleMenuState[menuItemId].visible,
          displayOrder: newOrder
        })
      });
      
      if (!response.ok) {
        throw new Error('메뉴 설정을 저장하는 중 오류가 발생했습니다.');
      }
      
      toast.success('메뉴 순서가 변경되었습니다.');
    } catch (error) {
      console.error('메뉴 순서 변경 오류:', error);
      toast.error('메뉴 순서를 변경하는 중 오류가 발생했습니다.');
      
      // 오류 발생 시 이전 상태로 롤백
      setModuleMenuState(prev => ({
        ...prev,
        [menuItemId]: {
          ...prev[menuItemId],
          order: direction === 'up' ? prev[menuItemId].order + 1 : prev[menuItemId].order - 1
        }
      }));
    }
  };
  
  return (
    <div className="space-y-6">
      {modules.length === 0 ? (
        <p className="text-gray-500">구독한 모듈이 없습니다.</p>
      ) : (
        modules.map(module => (
          <div key={module.id} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">{module.name}</h3>
            
            <div className="space-y-2">
              {module.menuItems.length === 0 ? (
                <p className="text-gray-500">이 모듈에는 메뉴 항목이 없습니다.</p>
              ) : (
                module.menuItems
                  .sort((a, b) => {
                    // 설정된 순서대로 정렬
                    const orderA = moduleMenuState[a.id]?.order ?? a.display_order;
                    const orderB = moduleMenuState[b.id]?.order ?? b.display_order;
                    return orderA - orderB;
                  })
                  .map(menuItem => (
                    <div 
                      key={menuItem.id} 
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{menuItem.label}</p>
                        <p className="text-sm text-gray-500">{menuItem.path}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOrderChange(menuItem.id, 'up')}
                            disabled={module.menuItems.findIndex(item => {
                              const orderA = moduleMenuState[item.id]?.order ?? item.display_order;
                              const orderB = moduleMenuState[menuItem.id]?.order ?? menuItem.display_order;
                              return orderA === orderB;
                            }) === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOrderChange(menuItem.id, 'down')}
                            disabled={module.menuItems.findIndex(item => {
                              const orderA = moduleMenuState[item.id]?.order ?? item.display_order;
                              const orderB = moduleMenuState[menuItem.id]?.order ?? menuItem.display_order;
                              return orderA === orderB;
                            }) === module.menuItems.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">표시</span>
                          <Switch 
                            checked={moduleMenuState[menuItem.id]?.visible}
                            onCheckedChange={(checked: boolean) => handleVisibilityChange(menuItem.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
} 