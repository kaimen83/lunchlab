'use client';

import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Tag, CircleSlash, CheckCircle2 } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
}

interface IngredientListProps {
  flattenedItems: { id: string; idx: number }[];
  recentIngredients: Ingredient[];
  filteredAndGroupedIngredients: [string, Ingredient[]][];
  searchQuery: string;
  focusedItemIndex: number;
  onIngredientSelect: (id: string) => void;
  handleListKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * 식재료 목록을 표시하는 컴포넌트
 * 최근 사용 식재료와 그룹화된 식재료 목록을 보여줍니다.
 */
export function IngredientList({
  flattenedItems,
  recentIngredients,
  filteredAndGroupedIngredients,
  searchQuery,
  focusedItemIndex,
  onIngredientSelect,
  handleListKeyDown
}: IngredientListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const focusedItemRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={listRef}
      className="max-h-[60vh] overflow-y-auto py-2 md:max-h-[400px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50 rounded-md"
      onKeyDown={handleListKeyDown}
      tabIndex={0}
      role="listbox"
      aria-labelledby="ingredients-list"
    >
      {flattenedItems.length === 0 && (
        <div className="py-6 text-center text-gray-500">
          <div className="flex flex-col items-center gap-2">
            <CircleSlash className="h-8 w-8 text-gray-300" />
            <p>검색 결과가 없습니다</p>
          </div>
        </div>
      )}
      
      {recentIngredients.length > 0 && !searchQuery && (
        <>
          <div className="pb-1">
            <div className="text-sm font-medium px-3 py-1 text-gray-500">최근 사용</div>
            <div className="py-1 px-1 space-y-1">
              {recentIngredients.map((ingredient) => {
                const currentIdx = flattenedItems.findIndex(item => item.id === ingredient.id);
                const isFocused = currentIdx === focusedItemIndex;
                
                return (
                  <div
                    key={ingredient.id}
                    ref={isFocused ? focusedItemRef : null}
                    onClick={() => onIngredientSelect(ingredient.id)}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer",
                      isFocused ? "bg-blue-100 ring-2 ring-blue-500 ring-opacity-50" : ""
                    )}
                    role="option"
                    aria-selected={isFocused}
                    data-focused={isFocused ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 truncate">
                        <span className="font-medium">{ingredient.name}</span>
                        <Badge variant="outline" className="ml-2 bg-gray-50 text-xs font-normal">
                          {ingredient.package_amount} {ingredient.unit}
                        </Badge>
                      </div>
                    </div>
                    <CheckCircle2 className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isFocused ? "opacity-100 text-blue-500" : "opacity-0"
                    )} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="my-1 h-px bg-gray-100" />
        </>
      )}
      
      <div className="py-2">
        {filteredAndGroupedIngredients.map(([group, items]) => (
          <div key={group} className="pb-1">
            <div className="text-sm font-medium px-3 py-1 text-gray-500">{group}</div>
            <div className="py-1 px-1 space-y-1">
              {items.map((ingredient) => {
                const currentIdx = flattenedItems.findIndex(item => item.id === ingredient.id);
                const isFocused = currentIdx === focusedItemIndex;
                
                return (
                  <div
                    key={ingredient.id}
                    ref={isFocused ? focusedItemRef : null}
                    onClick={() => onIngredientSelect(ingredient.id)}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer",
                      isFocused ? "bg-blue-100 ring-2 ring-blue-500 ring-opacity-50" : ""
                    )}
                    role="option"
                    aria-selected={isFocused}
                    data-focused={isFocused ? "true" : undefined}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Tag className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1 truncate">
                        <span className="font-medium">{ingredient.name}</span>
                        <Badge variant="outline" className="ml-2 bg-gray-50 text-xs font-normal">
                          {ingredient.package_amount} {ingredient.unit}
                        </Badge>
                      </div>
                    </div>
                    <CheckCircle2 className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isFocused ? "opacity-100 text-blue-500" : "opacity-0"
                    )} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 