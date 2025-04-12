'use client';

import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DialogTrigger } from '@/components/ui/dialog';
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
  containerMenuSelections: Record<string, string>;
  isLoadingMenus: boolean;
  isLoadingMenuContainers: boolean;
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
}

export default function MealPlanMenuSelection({
  selectedContainers,
  sortedSelectedContainers,
  containerMenuSelections,
  isLoadingMenus,
  isLoadingMenuContainers,
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
  initialData
}: MealPlanMenuSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>메뉴 선택</CardTitle>
        <CardDescription>각 용기에 담을 메뉴를 선택해주세요.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingMenus || isLoadingMenuContainers ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSelectedContainers.map(containerId => {
              const containerDetails = getContainerDetailsById(containerId);
              const selectedMenuId = containerMenuSelections[containerId];
              const menuDetails = selectedMenuId ? getMenuDetailsById(selectedMenuId) : null;
              const costInfo = selectedMenuId 
                ? getCostInfoForMenuAndContainer(selectedMenuId, containerId, menuContainers)
                : { total_cost: 0, ingredients_cost: 0 };
              
              return (
                <div 
                  key={containerId}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/10"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{containerDetails?.name}</div>
                    {selectedMenuId ? (
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <span className="mr-2">{menuDetails?.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatPrice(costInfo.total_cost)}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs mt-1">
                        메뉴 미선택
                      </Badge>
                    )}
                  </div>
                  
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedContainerForMenu(containerId);
                        setIsMenuSelectOpen(true);
                        setMenuSearchTerm('');
                      }}
                    >
                      {selectedMenuId ? '메뉴 변경' : '메뉴 선택'}
                    </Button>
                  </DialogTrigger>
                </div>
              );
            })}
          </div>
        )}
        
        {selectedContainers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            먼저 용기를 선택해주세요.
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
            selectedMenuId={containerMenuSelections[selectedContainerForMenu]}
            onMenuSelect={handleMenuSelection}
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
          {initialData ? '수정' : '추가'}
        </Button>
      </CardFooter>
    </Card>
  );
} 