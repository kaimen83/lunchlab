'use client';

import React from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  FilePen, 
  LineChart, 
  Trash2, 
  MoreVertical,
  ArrowUpDown,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Ingredient, VisibleColumns } from '../types';
import { formatCurrency, formatNumber } from '../utils';

interface DesktopTableProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  visibleColumns: VisibleColumns;
  expandedRows: Record<string, boolean>;
  detailedIngredients: Record<string, Ingredient>;
  loadingDetails: Record<string, boolean>;
  sortField: keyof Ingredient;
  sortDirection: 'asc' | 'desc';
  isOwnerOrAdmin: boolean;
  toggleSort: (field: keyof Ingredient) => void;
  toggleRowExpand: (ingredientId: string) => void;
  handleEditIngredient: (ingredient: Ingredient) => void;
  handleViewPriceHistory: (ingredient: Ingredient) => void;
  handleDeleteConfirm: (ingredient: Ingredient) => void;
  selectedIngredients: string[];
  handleToggleSelect: (ingredientId: string) => void;
  handleToggleSelectAll: () => void;
}

const DesktopTable: React.FC<DesktopTableProps> = ({
  ingredients,
  isLoading,
  visibleColumns,
  expandedRows,
  detailedIngredients,
  loadingDetails,
  sortField,
  sortDirection,
  isOwnerOrAdmin,
  toggleSort,
  toggleRowExpand,
  handleEditIngredient,
  handleViewPriceHistory,
  handleDeleteConfirm,
  selectedIngredients,
  handleToggleSelect,
  handleToggleSelectAll
}) => {
  // 테이블 헤더 렌더링 함수
  const renderTableHeader = () => (
    <TableHeader className="bg-muted/20">
      <TableRow>
        {/* 체크박스 칼럼 추가 */}
        <TableHead className="w-[40px] px-2">
          {isOwnerOrAdmin && (
            <Checkbox
              checked={ingredients.length > 0 && selectedIngredients.length === ingredients.length}
              onCheckedChange={handleToggleSelectAll}
              aria-label="전체 선택"
              className={
                ingredients.length > 0 && selectedIngredients.length > 0 && selectedIngredients.length < ingredients.length
                  ? "opacity-70"
                  : ""
              }
            />
          )}
        </TableHead>
        
        {/* 확장 버튼 칼럼 */}
        <TableHead className="w-[40px]">
          <span className="sr-only">확장</span>
        </TableHead>
        
        {/* 식재료명 칼럼 */}
        {visibleColumns.name && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('name')}
          >
            <div className="flex items-center gap-1">
              <span>식재료명</span>
              {sortField === 'name' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'name' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 코드명 칼럼 */}
        {visibleColumns.code_name && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('code_name')}
          >
            <div className="flex items-center gap-1">
              <span>코드명</span>
              {sortField === 'code_name' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'code_name' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 식재료 업체 칼럼 */}
        {visibleColumns.supplier && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('supplier')}
          >
            <div className="flex items-center gap-1">
              <span>식재료 업체</span>
              {sortField === 'supplier' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'supplier' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 포장 단위 칼럼 */}
        {visibleColumns.package_amount && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('package_amount')}
          >
            <div className="flex items-center gap-1">
              <span>포장 단위</span>
              {sortField === 'package_amount' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'package_amount' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 가격 칼럼 */}
        {visibleColumns.price && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('price')}
          >
            <div className="flex items-center gap-1">
              <span>가격</span>
              {sortField === 'price' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'price' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 박스당 갯수 칼럼 */}
        {visibleColumns.items_per_box && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('items_per_box')}
          >
            <div className="flex items-center gap-1">
              <span>박스당 갯수</span>
              {sortField === 'items_per_box' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'items_per_box' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 재고관리 등급 칼럼 */}
        {visibleColumns.stock_grade && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('stock_grade')}
          >
            <div className="flex items-center gap-1">
              <span>재고관리 등급</span>
              {sortField === 'stock_grade' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'stock_grade' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 원산지 칼럼 */}
        {visibleColumns.origin && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('origin')}
          >
            <div className="flex items-center gap-1">
              <span>원산지</span>
              {sortField === 'origin' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'origin' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 칼로리 칼럼 */}
        {visibleColumns.calories && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('calories')}
          >
            <div className="flex items-center gap-1">
              <span>칼로리</span>
              {sortField === 'calories' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'calories' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 영양성분 칼럼 - 정렬 불가능 */}
        {visibleColumns.nutrition && (
          <TableHead>
            <span>영양성분</span>
          </TableHead>
        )}
        
        {/* 알러지 유발물질 칼럼 */}
        {visibleColumns.allergens && (
          <TableHead 
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => toggleSort('allergens')}
          >
            <div className="flex items-center gap-1">
              <span>알러지 유발물질</span>
              {sortField === 'allergens' && (
                <div className="rounded-full bg-primary/10 p-0.5">
                  {sortDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-primary" />
                  )}
                </div>
              )}
              {sortField !== 'allergens' && (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          </TableHead>
        )}
        
        {/* 작업 칼럼 */}
        <TableHead className="w-[80px]">
          <span className="sr-only">작업</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  // 테이블 로딩 상태 표시
  if (isLoading) {
    return (
      <Table>
        {renderTableHeader()}
        <TableBody>
          <TableRow>
            <TableCell colSpan={12} className="h-24 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  // 데이터가 없는 경우
  if (ingredients.length === 0) {
    return (
      <Table>
        {renderTableHeader()}
        <TableBody>
          <TableRow>
            <TableCell colSpan={12} className="h-24 text-center">
              검색 결과가 없습니다.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      {renderTableHeader()}
      <TableBody>
        {ingredients.map(ingredient => {
          const isExpanded = !!expandedRows[ingredient.id];
          const detailedData = detailedIngredients[ingredient.id] || ingredient;
          const isDetailLoading = loadingDetails[ingredient.id];
          
          return (
            <React.Fragment key={ingredient.id}>
              {/* 기본 행 */}
              <TableRow className={isExpanded ? 'bg-muted/50' : ''}>
                {/* 체크박스 셀 추가 */}
                <TableCell className="p-2 w-10">
                  {isOwnerOrAdmin && (
                    <Checkbox
                      checked={selectedIngredients.includes(ingredient.id)}
                      onCheckedChange={() => handleToggleSelect(ingredient.id)}
                      aria-label={`${ingredient.name} 선택`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </TableCell>
                
                {/* 확장 버튼 */}
                <TableCell className="p-2 w-10">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleRowExpand(ingredient.id)}
                    className="h-8 w-8"
                  >
                    {isExpanded ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    }
                  </Button>
                </TableCell>
                
                {/* 기본 필드들 */}
                {visibleColumns.name && (
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                )}
                
                {visibleColumns.code_name && (
                  <TableCell>{ingredient.code_name || '-'}</TableCell>
                )}
                
                {visibleColumns.supplier && (
                  <TableCell>{ingredient.supplier || '-'}</TableCell>
                )}
                
                {visibleColumns.package_amount && (
                  <TableCell>{formatNumber(ingredient.package_amount)} {ingredient.unit}</TableCell>
                )}
                
                {visibleColumns.price && (
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span>{formatCurrency(ingredient.price)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPriceHistory(ingredient);
                        }}
                        aria-label="가격 기록 보기"
                      >
                        <LineChart className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                )}
                
                {visibleColumns.items_per_box && (
                  <TableCell>{ingredient.items_per_box || '-'}</TableCell>
                )}
                
                {visibleColumns.stock_grade && (
                  <TableCell>
                    {ingredient.stock_grade ? (
                      <Badge variant={
                        ingredient.stock_grade === 'A' ? 'default' :
                        ingredient.stock_grade === 'B' ? 'secondary' :
                        ingredient.stock_grade === 'C' ? 'outline' : 'destructive'
                      }>
                        {ingredient.stock_grade}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                )}
                
                {/* 작업 */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">메뉴</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditIngredient(ingredient)}>
                        <FilePen className="mr-2 h-4 w-4" />
                        <span>수정</span>
                      </DropdownMenuItem>
                      {isOwnerOrAdmin && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteConfirm(ingredient)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>삭제</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              
              {/* 확장된 행 (상세 정보) */}
              {isExpanded && (
                <TableRow className="bg-muted/25 border-0">
                  <TableCell colSpan={13} className="px-4 py-3">
                    {isDetailLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* 영양 정보 */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center">
                            <Info className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>영양 정보</span>
                          </h4>
                          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">칼로리:</span>
                            <span>{detailedData.calories ? `${detailedData.calories} kcal` : '-'}</span>
                            
                            <span className="text-muted-foreground">단백질:</span>
                            <span>{detailedData.protein ? `${detailedData.protein}g` : '-'}</span>
                            
                            <span className="text-muted-foreground">지방:</span>
                            <span>{detailedData.fat ? `${detailedData.fat}g` : '-'}</span>
                            
                            <span className="text-muted-foreground">탄수화물:</span>
                            <span>{detailedData.carbs ? `${detailedData.carbs}g` : '-'}</span>
                          </div>
                        </div>
                        
                        {/* 원산지 및 알러지 정보 */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">원산지 및 알러지 정보</h4>
                          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">원산지:</span>
                            <span>{detailedData.origin || '-'}</span>
                            
                            <span className="text-muted-foreground">알러지 유발물질:</span>
                            <span>{detailedData.allergens || '-'}</span>
                          </div>
                        </div>
                        
                        {/* 기타 정보 */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">기타 정보</h4>
                          <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">메모:</span>
                            <span>{detailedData.memo1 || '-'}</span>
                            
                            <span className="text-muted-foreground">등록일:</span>
                            <span>
                              {detailedData.created_at ? 
                                new Date(detailedData.created_at).toLocaleDateString() : 
                                '-'
                              }
                            </span>
                            
                            <span className="text-muted-foreground">최종 수정일:</span>
                            <span>
                              {detailedData.updated_at ? 
                                new Date(detailedData.updated_at).toLocaleDateString() : 
                                '-'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default DesktopTable; 