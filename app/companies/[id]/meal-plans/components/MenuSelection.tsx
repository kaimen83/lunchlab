'use client';

import { Dispatch, SetStateAction, useState, MouseEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Menu, MenuContainer } from './types';
import { cn } from '@/lib/utils';
import { 
  formatPrice, 
  isMenuCompatibleWithContainer, 
  getCostInfoForMenuAndContainer,
  getCompatibleContainersForMenu,
  formatCalories
} from './utils';
import { Button } from '@/components/ui/button';

interface MenuSelectionProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  containerId: string | null;
  containerName: string | undefined;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  filteredMenus: Menu[];
  selectedMenuId: string | undefined;
  onMenuSelect: (containerId: string, menuId: string, compatibleContainerId?: string) => void;
  menuContainers: MenuContainer[];
}

export default function MenuSelection({
  isOpen,
  setIsOpen,
  containerId,
  containerName,
  searchTerm,
  setSearchTerm,
  filteredMenus,
  selectedMenuId,
  onMenuSelect,
  menuContainers
}: MenuSelectionProps) {
  if (!containerId) return null;
  
  // 메뉴 선택 중인지 추적하는 상태 추가
  const [isSelecting, setIsSelecting] = useState(false);

  // 호환되지 않는 메뉴 선택 시 대화상자 상태
  const [incompatibleMenuDialogOpen, setIncompatibleMenuDialogOpen] = useState(false);
  const [selectedIncompatibleMenu, setSelectedIncompatibleMenu] = useState<Menu | null>(null);
  const [compatibleContainers, setCompatibleContainers] = useState<{
    containerId: string;
    containerName: string | undefined;
    costInfo: { total_cost: number; ingredients_cost: number };
    calories: number;
  }[]>([]);
  // 선택된 호환 가능 용기 상태 추가
  const [selectedCompatibleContainerId, setSelectedCompatibleContainerId] = useState<string | null>(null);

  // 메뉴 선택 핸들러
  const handleMenuSelect = (e: MouseEvent, menuId: string, menu: Menu) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 버블링 방지
    
    // 해당 메뉴가 현재 용기와 호환되는지 확인
    const isCompatible = isMenuCompatibleWithContainer(menuId, containerId, menuContainers);
    
    if (isCompatible) {
      // 호환되는 메뉴라면 바로 선택 처리
      setIsSelecting(true);
      setTimeout(() => {
        onMenuSelect(containerId, menuId);
        setIsSelecting(false);
      }, 10);
    } else {
      // 호환되지 않는 메뉴라면 다른 용기와의 호환성 확인
      const compatibleWithOtherContainers = getCompatibleContainersForMenu(
        menuId, 
        containerId, 
        menuContainers
      );
      
      if (compatibleWithOtherContainers.length > 0) {
        // 다른 용기와 호환되는 경우 대화상자 표시
        setSelectedIncompatibleMenu(menu);
        setCompatibleContainers(compatibleWithOtherContainers);
        // 첫 번째 호환 가능 용기를 기본 선택
        setSelectedCompatibleContainerId(compatibleWithOtherContainers[0].containerId);
        setIncompatibleMenuDialogOpen(true);
      } else {
        // 다른 어떤 용기와도 호환되지 않는 경우 기본 선택 처리
        setIsSelecting(true);
        setTimeout(() => {
          onMenuSelect(containerId, menuId);
          setIsSelecting(false);
        }, 10);
      }
    }
  };

  // 다른 용기 정보로 메뉴 선택하기
  const handleSelectWithOtherContainer = () => {
    if (selectedIncompatibleMenu && containerId) {
      setIsSelecting(true);
      setTimeout(() => {
        // 선택한 호환 용기 ID를 추가 파라미터로 전달
        onMenuSelect(containerId, selectedIncompatibleMenu.id, selectedCompatibleContainerId || undefined);
        setIncompatibleMenuDialogOpen(false);
        setIsSelecting(false);
        // 선택된 호환 용기 ID 초기화
        setSelectedCompatibleContainerId(null);
      }, 10);
    }
  };

  // 호환 가능 용기 선택 핸들러
  const handleCompatibleContainerSelect = (containerId: string) => {
    setSelectedCompatibleContainerId(containerId);
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          // 메뉴 선택 중이면 모달 닫기 이벤트 무시
          if (isSelecting) return;
          setIsOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md py-3 sm:py-4" onPointerDownOutside={(e) => {
          // 메뉴 선택 중이면 외부 클릭 이벤트 방지
          if (isSelecting) {
            e.preventDefault();
          }
        }}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">
              {containerName}에 담을 메뉴 선택
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="메뉴 검색..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="h-52 sm:h-72 border rounded-md">
              <div className="p-2">
                {filteredMenus.length > 0 ? (
                  <>
                    {/* 호환되는 메뉴 그룹 */}
                    {filteredMenus.some(menu => isMenuCompatibleWithContainer(menu.id, containerId, menuContainers)) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1 px-1">호환되는 메뉴</h4>
                        {filteredMenus
                          .filter(menu => isMenuCompatibleWithContainer(menu.id, containerId, menuContainers))
                          .map(menu => {
                            const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId, menuContainers);
                            
                            return (
                              <div 
                                key={menu.id} 
                                className={cn(
                                  "flex flex-col p-3 border-b cursor-pointer hover:bg-accent/20",
                                  selectedMenuId === menu.id && "bg-accent/30"
                                )}
                                onClick={(e) => handleMenuSelect(e, menu.id, menu)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="font-medium">{menu.name}</span>
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      호환
                                    </Badge>
                                  </div>
                                  <span className="text-sm font-medium">
                                    {formatPrice(costInfo.total_cost)}
                                  </span>
                                </div>
                                {menu.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {menu.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                    
                    {/* 다른 용기와 호환되는 메뉴 그룹 */}
                    {filteredMenus.some(menu => {
                      const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId, menuContainers);
                      return !isCompatible && getCompatibleContainersForMenu(menu.id, containerId, menuContainers).length > 0;
                    }) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1 px-1">다른 용기와 호환되는 메뉴</h4>
                        {filteredMenus
                          .filter(menu => {
                            const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId, menuContainers);
                            return !isCompatible && getCompatibleContainersForMenu(menu.id, containerId, menuContainers).length > 0;
                          })
                          .map(menu => {
                            const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId, menuContainers);
                            
                            return (
                              <div 
                                key={menu.id} 
                                className={cn(
                                  "flex flex-col p-3 border-b cursor-pointer hover:bg-accent/20",
                                  selectedMenuId === menu.id && "bg-accent/30"
                                )}
                                onClick={(e) => handleMenuSelect(e, menu.id, menu)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="font-medium">{menu.name}</span>
                                    <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-600">
                                      다른 용기 호환
                                    </Badge>
                                  </div>
                                  <span className="text-sm font-medium">
                                    {costInfo.total_cost > 0 ? formatPrice(costInfo.total_cost) : ''}
                                  </span>
                                </div>
                                {menu.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {menu.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                    
                    {/* 호환되지 않는 메뉴 그룹 */}
                    {filteredMenus.some(menu => {
                      const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId, menuContainers);
                      return !isCompatible && getCompatibleContainersForMenu(menu.id, containerId, menuContainers).length === 0;
                    }) && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1 px-1">호환되지 않는 메뉴</h4>
                        {filteredMenus
                          .filter(menu => {
                            const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId, menuContainers);
                            return !isCompatible && getCompatibleContainersForMenu(menu.id, containerId, menuContainers).length === 0;
                          })
                          .map(menu => {
                            return (
                              <div 
                                key={menu.id} 
                                className={cn(
                                  "flex flex-col p-3 border-b last:border-0 cursor-pointer hover:bg-accent/20",
                                  selectedMenuId === menu.id && "bg-accent/30"
                                )}
                                onClick={(e) => handleMenuSelect(e, menu.id, menu)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <span className="font-medium">{menu.name}</span>
                                  </div>
                                </div>
                                {menu.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {menu.description}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* 호환되지 않는 메뉴 선택 시 대화상자 */}
      <Dialog open={incompatibleMenuDialogOpen} onOpenChange={setIncompatibleMenuDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              호환되지 않는 메뉴
            </DialogTitle>
            <DialogDescription>
              선택하신 <span className="font-medium">{selectedIncompatibleMenu?.name}</span> 메뉴는 현재 용기 <span className="font-medium">{containerName}</span>와 호환되지 않습니다.
              하지만 다른 용기에서는 사용 가능합니다. 아래 호환되는 용기 중 하나를 선택하여 해당 용기의 용량 정보를 현재 용기에 적용할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h4 className="text-sm font-medium mb-2">호환되는 용기를 선택하세요:</h4>
            <div className="space-y-2">
              {compatibleContainers.map((container) => (
                <div 
                  key={container.containerId} 
                  className={cn(
                    "flex flex-col p-2 border rounded-md cursor-pointer transition-colors",
                    selectedCompatibleContainerId === container.containerId 
                      ? "bg-blue-50 border-blue-300" 
                      : "hover:bg-accent/10"
                  )}
                  onClick={() => handleCompatibleContainerSelect(container.containerId)}
                >
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "font-medium",
                      selectedCompatibleContainerId === container.containerId && "text-blue-600"
                    )}>
                      {container.containerName}
                    </span>
                    <Badge 
                      variant={selectedCompatibleContainerId === container.containerId ? "default" : "outline"}
                    >
                      {formatPrice(container.costInfo.total_cost)}
                    </Badge>
                  </div>
                  {container.calories > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCalories(container.calories)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIncompatibleMenuDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSelectWithOtherContainer} disabled={!selectedCompatibleContainerId}>
              선택한 용기 용량으로 적용하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 