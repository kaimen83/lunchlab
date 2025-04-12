'use client';

import { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Menu, MenuContainer } from './types';
import { cn } from '@/lib/utils';
import { formatPrice, isMenuCompatibleWithContainer, getCostInfoForMenuAndContainer } from './utils';

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {containerName}에 담을 메뉴 선택
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-4">
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
          <ScrollArea className="h-72 border rounded-md">
            <div className="p-2">
              {filteredMenus.length > 0 ? (
                filteredMenus.map(menu => {
                  const isCompatible = isMenuCompatibleWithContainer(menu.id, containerId, menuContainers);
                  const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId, menuContainers);
                  
                  return (
                    <div 
                      key={menu.id} 
                      className={cn(
                        "flex flex-col p-3 border-b last:border-0 cursor-pointer hover:bg-accent/20",
                        selectedMenuId === menu.id && "bg-accent/30"
                      )}
                      onClick={() => onMenuSelect(containerId, menu.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{menu.name}</span>
                          {isCompatible && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              호환
                            </Badge>
                          )}
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
                })
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
  );
} 