'use client';

import { Dispatch, SetStateAction, MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Container, Menu, MenuContainer } from './types';
import { formatPrice, getCostInfoForMenuAndContainer } from './utils';
import MenuSelection from './MenuSelection';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface MealPlanMenuSelectionProps {
  selectedContainers: string[];
  sortedSelectedContainers: string[];
  containerMenuSelections: Record<string, string[]>;
  containerLoadingState: Record<string, boolean>;
  getContainerDetailsById: (containerId: string) => Container | undefined;
  getMenuDetailsById: (menuId: string) => Menu | undefined;
  menuContainers: MenuContainer[];
  isLoading: boolean;
  setActiveTab: Dispatch<SetStateAction<string>>;
  isMenuSelectOpen: boolean;
  setIsMenuSelectOpen: Dispatch<SetStateAction<boolean>>;
  selectedContainerForMenu: string | null;
  setSelectedContainerForMenu: Dispatch<SetStateAction<string | null>>;
  menuSearchTerm: string;
  setMenuSearchTerm: Dispatch<SetStateAction<string>>;
  getFilteredMenusForContainer: (containerId: string) => Menu[];
  handleMenuSelection: (containerId: string, menuId: string) => void;
  initialData: any | null;
  loadMenusForContainer: (containerId: string) => Promise<void>;
}

export default function MealPlanMenuSelection({
  selectedContainers,
  sortedSelectedContainers,
  containerMenuSelections,
  containerLoadingState,
  getContainerDetailsById,
  getMenuDetailsById,
  menuContainers,
  isLoading,
  setActiveTab,
  isMenuSelectOpen,
  setIsMenuSelectOpen,
  selectedContainerForMenu,
  setSelectedContainerForMenu,
  menuSearchTerm,
  setMenuSearchTerm,
  getFilteredMenusForContainer,
  handleMenuSelection,
  initialData,
  loadMenusForContainer
}: MealPlanMenuSelectionProps) {

  const handleOpenMenuSelect = async (e: MouseEvent, containerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedContainerForMenu(containerId);
    setMenuSearchTerm('');
    
    await loadMenusForContainer(containerId);
    
    setTimeout(() => {
      setIsMenuSelectOpen(true);
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 선택</CardTitle>
        <CardDescription>각 용기에 담을 메뉴를 선택해주세요. 각 용기에 여러 메뉴를 선택할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {selectedContainers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            먼저 용기를 선택해주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedSelectedContainers.map(containerId => {
              const containerDetails = getContainerDetailsById(containerId);
              const selectedMenuIds = containerMenuSelections[containerId] || [];
              const isContainerLoading = containerLoadingState[containerId] || false;
              
              const totalCost = selectedMenuIds.reduce((sum, menuId) => {
                const costInfo = getCostInfoForMenuAndContainer(menuId, containerId, menuContainers);
                return sum + costInfo.total_cost;
              }, 0);
              
              return (
                <div 
                  key={containerId}
                  className="border rounded-md p-3 hover:bg-accent/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{containerDetails?.name}</div>
                      {totalCost > 0 && (
                        <Badge variant="outline" className="mt-1">
                          총 {formatPrice(totalCost)}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={(e) => handleOpenMenuSelect(e as MouseEvent, containerId)}
                      disabled={isContainerLoading}
                    >
                      {isContainerLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          로딩중...
                        </>
                      ) : (
                        selectedMenuIds.length > 0 ? '메뉴 추가/변경' : '메뉴 선택'
                      )}
                    </Button>
                  </div>
                  
                  {selectedMenuIds.length > 0 ? (
                    <div className="space-y-1 mt-2">
                      {selectedMenuIds.map(menuId => {
                        const menuDetails = getMenuDetailsById(menuId);
                        const costInfo = getCostInfoForMenuAndContainer(menuId, containerId, menuContainers);
                        
                        return (
                          <div key={menuId} className="flex justify-between items-center p-2 bg-accent/10 rounded">
                            <span className="text-sm">{menuDetails?.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {formatPrice(costInfo.total_cost)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMenuSelection(containerId, menuId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      메뉴가 선택되지 않았습니다.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {selectedContainerForMenu && (
          <MenuSelection 
            isOpen={isMenuSelectOpen}
            setIsOpen={setIsMenuSelectOpen}
            containerId={selectedContainerForMenu}
            containerName={getContainerDetailsById(selectedContainerForMenu)?.name}
            searchTerm={menuSearchTerm}
            setSearchTerm={setMenuSearchTerm}
            filteredMenus={getFilteredMenusForContainer(selectedContainerForMenu)}
            selectedMenuId={undefined}
            selectedMenuIds={containerMenuSelections[selectedContainerForMenu] || []}
            onMenuSelect={(containerId, menuId) => handleMenuSelection(containerId, menuId)}
            menuContainers={menuContainers}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={() => setActiveTab("basic")} disabled={isLoading}>
          이전 단계
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? '저장' : '추가'}
        </Button>
      </CardFooter>
    </Card>
  );
} 