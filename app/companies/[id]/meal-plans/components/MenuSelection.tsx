'use client';

import { Dispatch, SetStateAction, useState, MouseEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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
  getCostInfoForMenuAndContainer
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
  onMenuSelect: (containerId: string, menuId: string) => void;
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

  // 메뉴 선택 핸들러 (단순화된 버전)
  const handleMenuSelect = (e: MouseEvent, menuId: string) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 버블링 방지
    
    setIsSelecting(true);
    setTimeout(() => {
      onMenuSelect(containerId, menuId);
      setIsSelecting(false);
    }, 10);
  };

  // 호환되는 메뉴만 필터링
  const compatibleMenus = filteredMenus.filter(menu => 
    isMenuCompatibleWithContainer(menu.id, containerId, menuContainers)
  );

  return (
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
              {compatibleMenus.length > 0 ? (
                <div>
                  {compatibleMenus.map(menu => {
                    const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId, menuContainers);
                    
                    return (
                      <div 
                        key={menu.id} 
                        className={cn(
                          "flex flex-col p-3 border-b cursor-pointer hover:bg-accent/20",
                          selectedMenuId === menu.id && "bg-accent/30"
                        )}
                        onClick={(e) => handleMenuSelect(e, menu.id)}
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
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {searchTerm ? '검색 결과가 없습니다' : '이 용기와 호환되는 메뉴가 없습니다'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 