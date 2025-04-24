'use client';

import React, { useState, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  LineChart, 
  FilePen, 
  Trash2,
  Search,
  PackageOpen,
  MoreVertical,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { MobileTableProps } from '../types';
import { formatCurrency, formatNumber, getStockGradeVariant } from '../utils';

const MobileTable: React.FC<MobileTableProps> = ({ 
  ingredients, 
  isLoading, 
  searchQuery, 
  isOwnerOrAdmin, 
  handleAddIngredient,
  handleEditIngredient,
  handleViewPriceHistory,
  handleDeleteConfirm,
  selectedIngredients,
  handleToggleSelect,
  formatCurrency,
  formatNumber
}) => {
  // 모바일에서 확장된 행 상태 관리 (한 번에 하나만 열림)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // 확장/축소 토글 처리 함수 - 모바일 터치 이벤트 최적화
  const toggleExpand = useCallback((id: string, e?: React.MouseEvent) => {
    // 이벤트가 있다면 이벤트 전파 방지
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setExpandedId(prev => prev === id ? null : id);
  }, []);
  
  // 행 클릭 처리 함수
  const handleRowClick = useCallback((id: string) => {
    toggleExpand(id);
  }, [toggleExpand]);
  
  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span>식재료 로딩 중...</span>
        </div>
      </div>
    );
  }
  
  if (ingredients.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          {searchQuery ? (
            <>
              <Search className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-base">'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
              <p className="text-sm mt-1">다른 검색어로 다시 시도해보세요.</p>
            </>
          ) : (
            <>
              <PackageOpen className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-base">등록된 식재료가 없습니다.</p>
              {isOwnerOrAdmin && (
                <Button 
                  variant="link" 
                  onClick={handleAddIngredient}
                  className="mt-2 text-primary"
                >
                  식재료 추가하기
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-muted/30 sticky top-0 z-10">
          <tr className="text-left text-xs font-medium text-muted-foreground">
            {isOwnerOrAdmin && (
              <th className="px-2 py-2.5 w-8">
                <span className="sr-only">선택</span>
              </th>
            )}
            <th className="px-3 py-2.5 whitespace-nowrap">식재료명</th>
            <th className="px-3 py-2.5 text-right whitespace-nowrap">가격</th>
            <th className="w-10 px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {ingredients.map(ingredient => (
            <React.Fragment key={ingredient.id}>
              <tr 
                className={`hover:bg-muted/20 transition-colors ${expandedId === ingredient.id ? 'bg-muted/10' : ''}`}
                onClick={() => handleRowClick(ingredient.id)}
              >
                {isOwnerOrAdmin && (
                  <td className="px-2 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIngredients.includes(ingredient.id)}
                      onCheckedChange={() => handleToggleSelect(ingredient.id)}
                      aria-label={`${ingredient.name} 선택`}
                    />
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <div className="font-medium truncate max-w-[150px]">
                    {ingredient.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {ingredient.supplier || '공급업체 미지정'}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="font-mono font-medium whitespace-nowrap">
                    {formatCurrency(ingredient.price)}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {ingredient.package_amount}{ingredient.unit === 'l' ? 'ml' : ingredient.unit}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(ingredient.id, e);
                      }}
                    >
                      {expandedId === ingredient.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
              
              {expandedId === ingredient.id && (
                <tr className="bg-muted/5" onClick={(e) => e.stopPropagation()}>
                  <td colSpan={3} className="px-3 py-2 border-t border-border/30">
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs py-1">
                      {ingredient.code_name && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">코드명:</span>
                          <span>{ingredient.code_name}</span>
                        </div>
                      )}
                      
                      {ingredient.items_per_box && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">박스당:</span>
                          <span>{formatNumber(ingredient.items_per_box)}개</span>
                        </div>
                      )}
                      
                      {ingredient.stock_grade && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">재고등급:</span>
                          <Badge variant={getStockGradeVariant(ingredient.stock_grade)} className="h-5 text-xs">{ingredient.stock_grade}</Badge>
                        </div>
                      )}
                      
                      {ingredient.origin && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">원산지:</span>
                          <span>{ingredient.origin}</span>
                        </div>
                      )}
                      
                      {ingredient.calories && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <span className="text-muted-foreground">칼로리:</span>
                          <span>{ingredient.calories} kcal</span>
                        </div>
                      )}
                      
                      {(ingredient.protein || ingredient.fat || ingredient.carbs) && (
                        <div className="col-span-2 mt-1 flex flex-wrap gap-1.5">
                          {ingredient.protein && (
                            <Badge variant="outline" className="text-xs font-normal">
                              단백질 {ingredient.protein}g
                            </Badge>
                          )}
                          {ingredient.fat && (
                            <Badge variant="outline" className="text-xs font-normal">
                              지방 {ingredient.fat}g
                            </Badge>
                          )}
                          {ingredient.carbs && (
                            <Badge variant="outline" className="text-xs font-normal">
                              탄수화물 {ingredient.carbs}g
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {ingredient.allergens && (
                        <div className="col-span-2 mt-1">
                          <span className="text-muted-foreground block">알러지:</span>
                          <span>{ingredient.allergens}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-border/30 flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={() => handleViewPriceHistory(ingredient)}
                      >
                        <LineChart className="h-3 w-3 mr-1" />
                        가격 이력
                      </Button>
                      
                      {isOwnerOrAdmin && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs"
                            onClick={() => handleEditIngredient(ingredient)}
                          >
                            <FilePen className="h-3 w-3 mr-1" />
                            편집
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-7 text-xs"
                            onClick={() => handleDeleteConfirm(ingredient)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MobileTable; 