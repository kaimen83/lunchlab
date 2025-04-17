'use client';

import { Dispatch, SetStateAction, useState, MouseEvent, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  selectedMenuIds: string[];
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
  selectedMenuIds = [],
  onMenuSelect,
  menuContainers
}: MenuSelectionProps) {
  if (!containerId) return null;
  
  // 임시 선택 상태를 관리할 로컬 상태 추가
  const [tempSelectedMenuIds, setTempSelectedMenuIds] = useState<string[]>([]);
  
  // 모달이 열릴 때 현재 선택된 메뉴 IDs로 임시 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setTempSelectedMenuIds([...selectedMenuIds]);
    }
  }, [isOpen, selectedMenuIds]);

  // 메뉴 선택/해제 핸들러 - 로컬 상태만 업데이트
  const handleMenuToggle = (menuId: string) => {
    setTempSelectedMenuIds(prev => {
      if (prev.includes(menuId)) {
        // 이미 선택된 메뉴면 제거
        return prev.filter(id => id !== menuId);
      } else {
        // 선택되지 않은 메뉴면 추가
        return [...prev, menuId];
      }
    });
  };
  
  // 확인 버튼 클릭 시 모든 변경사항 적용
  const handleConfirm = () => {
    // 1. 제거할 메뉴 처리 (현재 선택된 메뉴 중 temp에 없는 것)
    selectedMenuIds.forEach(menuId => {
      if (!tempSelectedMenuIds.includes(menuId)) {
        onMenuSelect(containerId, menuId); // 토글 함수 호출하여 삭제
      }
    });
    
    // 2. 추가할 메뉴 처리 (temp에 있지만 현재 선택되지 않은 것)
    tempSelectedMenuIds.forEach(menuId => {
      if (!selectedMenuIds.includes(menuId)) {
        onMenuSelect(containerId, menuId); // 토글 함수 호출하여 추가
      }
    });
    
    // 모달 닫기
    setIsOpen(false);
  };

  // 호환되는 메뉴만 필터링
  const compatibleMenus = filteredMenus.filter(menu => 
    isMenuCompatibleWithContainer(menu.id, containerId, menuContainers)
  );

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      <DialogContent className="sm:max-w-md py-3 sm:py-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">
            {containerName}에 담을 메뉴 선택
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            메뉴를 여러 개 선택한 후 하단의 확인 버튼을 눌러 적용하세요.
          </DialogDescription>
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
                    const isSelected = tempSelectedMenuIds.includes(menu.id);
                    const costInfo = getCostInfoForMenuAndContainer(menu.id, containerId, menuContainers);
                    
                    return (
                      <div 
                        key={menu.id} 
                        className={cn(
                          "flex flex-col p-3 border-b cursor-pointer hover:bg-accent/20",
                          isSelected && "bg-accent/30"
                        )}
                        onClick={() => handleMenuToggle(menu.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Checkbox 
                              checked={isSelected} 
                              className="mr-2" 
                              onCheckedChange={() => handleMenuToggle(menu.id)}
                            />
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
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
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
        <DialogFooter className="mt-4 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            취소
          </Button>
          <Button 
            variant="default" 
            onClick={handleConfirm}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            선택 완료 ({tempSelectedMenuIds.length}개)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 