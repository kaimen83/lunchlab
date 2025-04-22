'use client';

import { useRef, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Search, CircleSlash, ChevronUp } from 'lucide-react';
import { IngredientList } from './IngredientList';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

interface IngredientSearchSheetProps {
  isOpen: boolean;
  isLoading: boolean;
  availableIngredients: Ingredient[];
  searchQuery: string;
  recentIngredients: Ingredient[];
  filteredAndGroupedIngredients: [string, Ingredient[]][];
  flattenedItems: { id: string; idx: number }[];
  focusedItemIndex: number;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (query: string) => void;
  onIngredientSelect: (id: string) => void;
  handleListKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
}

/**
 * 식재료 검색 시트 컴포넌트
 * 식재료 검색 및 선택 기능 제공
 */
export function IngredientSearchSheet({
  isOpen,
  isLoading,
  availableIngredients,
  searchQuery,
  recentIngredients,
  filteredAndGroupedIngredients,
  flattenedItems,
  focusedItemIndex,
  searchInputRef,
  onOpenChange,
  onSearchChange,
  onIngredientSelect,
  handleListKeyDown
}: IngredientSearchSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start bg-white hover:bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200"
          type="button"
          disabled={isLoading || availableIngredients.length === 0}
        >
          <Search className="h-4 w-4 mr-2 text-blue-500" />
          식재료 검색
        </Button>
      </SheetTrigger>
      <SheetContent 
        className="w-full max-h-[92vh] p-0 rounded-t-2xl border-t-0 bg-gradient-to-b from-gray-50 to-white md:max-w-2xl md:mx-auto md:rounded-2xl md:border md:h-auto md:max-h-[600px] md:top-[50%] md:translate-y-[-50%] md:bottom-auto" 
        side="bottom" 
        closeButton={false}
      >
        <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/90 border-b border-gray-100 rounded-t-2xl">
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>
          <SheetHeader className="px-6 pt-2 pb-4">
            <SheetTitle className="text-xl font-bold text-gray-800">식재료 선택</SheetTitle>
            <SheetDescription className="text-gray-500">
              추가할 식재료를 검색하거나 목록에서 선택하세요. 식재료를 클릭하면 바로 추가됩니다.
              <span className="block text-xs text-blue-500 mt-1">Tab 키로 리스트로 이동 후 화살표 키와 Enter 키로 선택할 수 있습니다.</span>
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="식재료 이름 검색..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={handleListKeyDown}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 placeholder:text-gray-400 border-none"
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-gray-500 hover:text-gray-700"
                    onClick={() => onSearchChange('')}
                  >
                    <CircleSlash className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-6">
          <div className="rounded-xl overflow-hidden">
            <IngredientList
              flattenedItems={flattenedItems}
              recentIngredients={recentIngredients}
              filteredAndGroupedIngredients={filteredAndGroupedIngredients}
              searchQuery={searchQuery}
              focusedItemIndex={focusedItemIndex}
              onIngredientSelect={onIngredientSelect}
              handleListKeyDown={handleListKeyDown}
            />
          </div>
        </div>
        
        <SheetFooter className="px-6 py-4 border-t border-gray-100 bg-white">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-md py-3"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            닫기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
} 