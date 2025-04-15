'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  ChevronDown, ChevronUp, LineChart, MoreVertical, Eye,
  Settings, X, ChevronRight, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import IngredientForm from './IngredientForm';
import IngredientPriceHistory from './IngredientPriceHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

interface Ingredient {
  id: string;
  name: string;
  code_name?: string;
  supplier?: string;
  supplier_id?: string;
  package_amount: number;
  unit: string;
  price: number;
  items_per_box?: number;
  pac_count?: number;
  stock_grade?: string;
  memo1?: string;
  origin?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  allergens?: string;
  created_at: string;
  updated_at?: string;
}

interface IngredientsListProps {
  companyId: string;
  userRole: string;
}

export default function IngredientsList({ companyId, userRole }: IngredientsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  // 확장된 행 상태 관리
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  // 칼럼 가시성 상태 관리
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    code_name: true,
    supplier: true,
    package_amount: true,
    price: true,
    items_per_box: true,
    stock_grade: true,
    origin: false,
    calories: false,
    nutrition: false,
    allergens: false
  });

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // 식재료 목록 로드 - useCallback으로 메모이제이션
  const loadIngredients = useCallback(async () => {
    setIsLoading(true);
    try {
      // 모든 공급업체 목록을 먼저 가져옵니다
      const suppliersResponse = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
      let suppliersList: {id: string, name: string}[] = [];
      
      if (suppliersResponse.ok) {
        suppliersList = await suppliersResponse.json();
      }
      
      // 식재료 목록을 가져옵니다
      const response = await fetch(`/api/companies/${companyId}/ingredients`);
      
      if (!response.ok) {
        throw new Error('식재료 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // supplier_id가 있는 경우 공급업체 정보를 연결합니다
      const ingredientsWithSuppliers = data.map((ingredient: Ingredient) => {
        if (ingredient.supplier_id) {
          const matchedSupplier = suppliersList.find(s => s.id === ingredient.supplier_id);
          if (matchedSupplier) {
            return {
              ...ingredient,
              supplier: matchedSupplier.name
            };
          }
        }
        return ingredient;
      });
      
      setIngredients(ingredientsWithSuppliers);
    } catch (error) {
      console.error('식재료 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, toast]);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  // 정렬 처리
  const toggleSort = (field: keyof Ingredient) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬 및 필터링된 식재료 목록
  const filteredIngredients = ingredients
    .filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ingredient.code_name && ingredient.code_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ingredient.origin && ingredient.origin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ingredient.allergens && ingredient.allergens.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ingredient.unit && ingredient.unit.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ingredient.memo1 && ingredient.memo1.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  // 식재료 추가 모달 열기
  const handleAddIngredient = () => {
    setModalMode('create');
    setSelectedIngredient(null);
    setModalOpen(true);
  };

  // 식재료 수정 모달 열기
  const handleEditIngredient = (ingredient: Ingredient) => {
    setModalMode('edit');
    setSelectedIngredient(ingredient);
    setModalOpen(true);
  };

  // 식재료 삭제 확인 모달 열기
  const handleDeleteConfirm = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteConfirmOpen(true);
  };

  // 식재료 삭제 처리
  const handleDeleteIngredient = async () => {
    if (!ingredientToDelete) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredientToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '식재료 삭제에 실패했습니다.');
      }
      
      // 목록에서 해당 식재료 제거
      setIngredients(prev => prev.filter(i => i.id !== ingredientToDelete.id));
      
      toast({
        title: '삭제 완료',
        description: `${ingredientToDelete.name} 식재료가 삭제되었습니다.`,
        variant: 'default',
      });
      
      setDeleteConfirmOpen(false);
      setIngredientToDelete(null);
    } catch (error) {
      console.error('식재료 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 가격 이력 모달 열기
  const handleViewPriceHistory = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setHistoryModalOpen(true);
  };

  // 식재료 저장 후 처리
  const handleSaveIngredient = (savedIngredient: Ingredient) => {
    // 목록 업데이트하는 대신, 전체 목록을 다시 로드하여 최신 상태 반영
    loadIngredients();
    
    setModalOpen(false);
    setSelectedIngredient(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('ko-KR').format(number);
  };

  // 테이블 헤더 렌더링
  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="w-8"></TableHead>
        {visibleColumns.name && (
          <TableHead 
            className="cursor-pointer whitespace-nowrap"
            onClick={() => toggleSort('name')}
          >
            식재료 명
            {sortField === 'name' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline-block h-4 w-4 ml-1" /> : 
                <ChevronDown className="inline-block h-4 w-4 ml-1" />
            )}
          </TableHead>
        )}
        {visibleColumns.code_name && (
          <TableHead 
            className="cursor-pointer whitespace-nowrap"
            onClick={() => toggleSort('code_name')}
          >
            코드명
            {sortField === 'code_name' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline-block h-4 w-4 ml-1" /> : 
                <ChevronDown className="inline-block h-4 w-4 ml-1" />
            )}
          </TableHead>
        )}
        {visibleColumns.supplier && (
          <TableHead 
            className="cursor-pointer whitespace-nowrap"
            onClick={() => toggleSort('supplier')}
          >
            식재료 업체
            {sortField === 'supplier' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                <ChevronDown className="inline ml-1 h-4 w-4" />
            )}
          </TableHead>
        )}
        {visibleColumns.package_amount && (
          <TableHead className="whitespace-nowrap">포장 단위</TableHead>
        )}
        {visibleColumns.price && (
          <TableHead 
            className="cursor-pointer text-right whitespace-nowrap"
            onClick={() => toggleSort('price')}
          >
            가격
            {sortField === 'price' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                <ChevronDown className="inline ml-1 h-4 w-4" />
            )}
          </TableHead>
        )}
        {visibleColumns.items_per_box && (
          <TableHead className="whitespace-nowrap">박스당 갯수</TableHead>
        )}
        {visibleColumns.stock_grade && (
          <TableHead className="whitespace-nowrap">재고관리 등급</TableHead>
        )}
        {visibleColumns.origin && (
          <TableHead
            className="cursor-pointer whitespace-nowrap"
            onClick={() => toggleSort('origin')}
          >
            원산지
            {sortField === 'origin' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline-block h-4 w-4 ml-1" /> : 
                <ChevronDown className="inline-block h-4 w-4 ml-1" />
            )}
          </TableHead>
        )}
        {visibleColumns.calories && (
          <TableHead 
            className="cursor-pointer whitespace-nowrap"
            onClick={() => toggleSort('calories')}
          >
            칼로리
            {sortField === 'calories' && (
              sortDirection === 'asc' ? 
                <ChevronUp className="inline-block h-4 w-4 ml-1" /> : 
                <ChevronDown className="inline-block h-4 w-4 ml-1" />
            )}
          </TableHead>
        )}
        {visibleColumns.nutrition && (
          <TableHead className="whitespace-nowrap">영양성분</TableHead>
        )}
        {visibleColumns.allergens && (
          <TableHead className="whitespace-nowrap">알러지 유발물질</TableHead>
        )}
        <TableHead className="text-right whitespace-nowrap">작업</TableHead>
      </TableRow>
    </TableHeader>
  );

  // 테이블 행 렌더링
  const renderTableRows = () => (
    <TableBody>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center">로딩 중...</TableCell>
        </TableRow>
      ) : filteredIngredients.length === 0 ? (
        <TableRow>
          <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 식재료가 없습니다.'}
          </TableCell>
        </TableRow>
      ) : (
        filteredIngredients.map(ingredient => (
          <React.Fragment key={ingredient.id}>
            <TableRow className={expandedRows[ingredient.id] ? "border-b-0" : ""}>
              <TableCell className="p-0 pl-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => toggleRowExpand(ingredient.id)}
                >
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${expandedRows[ingredient.id] ? 'rotate-90' : ''}`} 
                  />
                </Button>
              </TableCell>
              {visibleColumns.name && (
                <TableCell className="font-medium">{ingredient.name}</TableCell>
              )}
              {visibleColumns.code_name && (
                <TableCell className="whitespace-nowrap">{ingredient.code_name || '-'}</TableCell>
              )}
              {visibleColumns.supplier && (
                <TableCell>{ingredient.supplier || '-'}</TableCell>
              )}
              {visibleColumns.package_amount && (
                <TableCell>{formatNumber(ingredient.package_amount)}{ingredient.unit}</TableCell>
              )}
              {visibleColumns.price && (
                <TableCell className="text-right">{formatCurrency(ingredient.price)}</TableCell>
              )}
              {visibleColumns.items_per_box && (
                <TableCell>{ingredient.items_per_box ? formatNumber(ingredient.items_per_box) : '-'}</TableCell>
              )}
              {visibleColumns.stock_grade && (
                <TableCell>{ingredient.stock_grade || '-'}</TableCell>
              )}
              {visibleColumns.origin && (
                <TableCell className="whitespace-nowrap">{ingredient.origin || '-'}</TableCell>
              )}
              {visibleColumns.calories && (
                <TableCell className="whitespace-nowrap">
                  {ingredient.calories ? `${ingredient.calories} kcal` : '-'}
                </TableCell>
              )}
              {visibleColumns.nutrition && (
                <TableCell className="whitespace-nowrap">
                  {ingredient.protein || ingredient.fat || ingredient.carbs ? 
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">영양성분 정보</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>단백질: {ingredient.protein || 0}g</p>
                          <p>지방: {ingredient.fat || 0}g</p>
                          <p>탄수화물: {ingredient.carbs || 0}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider> : '-'}
                </TableCell>
              )}
              {visibleColumns.allergens && (
                <TableCell className="whitespace-nowrap">
                  {ingredient.allergens || '-'}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewPriceHistory(ingredient)}
                    title="가격 이력 보기"
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                  {isOwnerOrAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditIngredient(ingredient)}
                        title="수정"
                      >
                        <FilePen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteConfirm(ingredient)}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
            {expandedRows[ingredient.id] && (
              <TableRow key={`${ingredient.id}-expanded`}>
                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="bg-muted/20 px-6 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {!visibleColumns.origin && ingredient.origin && (
                      <div>
                        <span className="font-medium text-sm">원산지:</span>
                        <p>{ingredient.origin}</p>
                      </div>
                    )}
                    {!visibleColumns.calories && ingredient.calories && (
                      <div>
                        <span className="font-medium text-sm">칼로리:</span>
                        <p>{ingredient.calories} kcal</p>
                      </div>
                    )}
                    {!visibleColumns.nutrition && (ingredient.protein || ingredient.fat || ingredient.carbs) && (
                      <div>
                        <span className="font-medium text-sm">영양성분:</span>
                        <p className="text-sm">
                          {ingredient.protein ? `단백질: ${ingredient.protein}g` : ''}
                          {ingredient.protein && <br />}
                          {ingredient.fat ? `지방: ${ingredient.fat}g` : ''}
                          {ingredient.fat && <br />}
                          {ingredient.carbs ? `탄수화물: ${ingredient.carbs}g` : ''}
                        </p>
                      </div>
                    )}
                    {!visibleColumns.allergens && ingredient.allergens && (
                      <div>
                        <span className="font-medium text-sm">알러지 유발물질:</span>
                        <p>{ingredient.allergens}</p>
                      </div>
                    )}
                    {ingredient.memo1 && (
                      <div>
                        <span className="font-medium text-sm">메모:</span>
                        <p>{ingredient.memo1}</p>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))
      )}
    </TableBody>
  );

  // 모바일 카드 아이템 렌더링
  const renderMobileCard = (ingredient: Ingredient) => (
    <Card className="p-4 mb-2">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-base">{ingredient.name}</h3>
          {ingredient.code_name && (
            <p className="text-xs text-muted-foreground mb-1">
              코드: {ingredient.code_name}
            </p>
          )}
          {ingredient.origin && (
            <p className="text-xs text-muted-foreground mb-1">
              원산지: {ingredient.origin}
            </p>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewPriceHistory(ingredient)}>
              <LineChart className="mr-2 h-4 w-4" />
              <span>가격 이력</span>
            </DropdownMenuItem>
            {isOwnerOrAdmin && (
              <>
                <DropdownMenuItem onClick={() => handleEditIngredient(ingredient)}>
                  <FilePen className="mr-2 h-4 w-4" />
                  <span>수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteConfirm(ingredient)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>삭제</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 gap-1 text-sm">
        <div className="text-muted-foreground">단가:</div>
        <div>{formatCurrency(ingredient.price)}원/{ingredient.package_amount}{ingredient.unit}</div>
        
        <div className="text-muted-foreground">공급업체:</div>
        <div>{ingredient.supplier || '-'}</div>
        
        {ingredient.calories && (
          <>
            <div className="text-muted-foreground">칼로리:</div>
            <div>{ingredient.calories} kcal</div>
          </>
        )}
        
        {(ingredient.protein || ingredient.fat || ingredient.carbs) && (
          <>
            <div className="text-muted-foreground">영양성분:</div>
            <div className="text-xs">
              {ingredient.protein ? `단백질 ${ingredient.protein}g` : ''}
              {ingredient.fat ? (ingredient.protein ? ', ' : '') + `지방 ${ingredient.fat}g` : ''}
              {ingredient.carbs ? ((ingredient.protein || ingredient.fat) ? ', ' : '') + `탄수화물 ${ingredient.carbs}g` : ''}
            </div>
          </>
        )}
        
        {ingredient.allergens && (
          <>
            <div className="text-muted-foreground">알러지 유발물질:</div>
            <div>{ingredient.allergens}</div>
          </>
        )}
      </div>
    </Card>
  );

  // 행 확장 토글
  const toggleRowExpand = (ingredientId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [ingredientId]: !prev[ingredientId]
    }));
  };

  return (
    <div className="p-2 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 w-full sm:w-[320px]">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="식재료 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-4 w-4" />
                <span>칼럼 설정</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={visibleColumns.name}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, name: checked})
                }
                disabled={true} // 필수 칼럼은 비활성화
              >
                식재료 명
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.code_name}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, code_name: checked})
                }
              >
                코드명
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.supplier}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, supplier: checked})
                }
              >
                식재료 업체
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.package_amount}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, package_amount: checked})
                }
              >
                포장 단위
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.price}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, price: checked})
                }
              >
                가격
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.items_per_box}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, items_per_box: checked})
                }
              >
                박스당 갯수
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.stock_grade}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, stock_grade: checked})
                }
              >
                재고관리 등급
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.origin}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, origin: checked})
                }
              >
                원산지
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.calories}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, calories: checked})
                }
              >
                칼로리
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.nutrition}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, nutrition: checked})
                }
              >
                영양성분
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.allergens}
                onCheckedChange={(checked) => 
                  setVisibleColumns({...visibleColumns, allergens: checked})
                }
              >
                알러지 유발물질
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddIngredient}>
            <Plus className="mr-2 h-4 w-4" /> 식재료 추가
          </Button>
        </div>
      </div>

      <Card>
        {/* 모바일 뷰 - 카드 형태로 표시 */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">로딩 중...</div>
          ) : filteredIngredients.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 식재료가 없습니다.'}
            </div>
          ) : (
            <div>
              {filteredIngredients.map(ingredient => (
                <div key={ingredient.id}>
                  {renderMobileCard(ingredient)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 데스크톱 뷰 - 테이블 형태로 표시 */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            {renderTableHeader()}
            {renderTableRows()}
          </Table>
        </div>
      </Card>

      {/* 식재료 추가/수정 모달 */}
      <Dialog 
        open={modalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
            // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
            setTimeout(() => {
              setModalOpen(false);
              setSelectedIngredient(null);
              
              // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
              document.body.style.pointerEvents = '';
              document.body.style.touchAction = '';
              
              // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
              try {
                // aria-hidden 속성 제거 - 안전하게 처리
                document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
                  try {
                    if (el instanceof HTMLElement && !el.dataset.permanent && document.body.contains(el)) {
                      el.removeAttribute('aria-hidden');
                    }
                  } catch (e) {
                    // 속성 제거 중 오류 시 무시
                  }
                });
              } catch (e) {
                // 오류 발생 시 조용히 처리
                console.warn("모달 닫기 처리 중 오류:", e);
              }
            }, 100); // 시간을 0에서 100으로 증가
          } else {
            setModalOpen(open);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="ingredient-form-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();
            
            // 이슈 #1236 해결: 터치 이벤트 차단 문제
            document.body.style.pointerEvents = '';
            document.body.style.touchAction = '';
            document.documentElement.style.touchAction = '';
            
            // 모든 포커스 제거
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onPointerDownOutside={(e) => {
            // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{modalMode === 'create' ? '식재료 추가' : '식재료 수정'}</DialogTitle>
          </DialogHeader>
          <div id="ingredient-form-description" className="sr-only">
            {modalMode === 'create' ? '식재료를 추가합니다' : '식재료 정보를 수정합니다'}
          </div>
          <IngredientForm
            companyId={companyId}
            ingredient={selectedIngredient}
            mode={modalMode}
            onSave={handleSaveIngredient}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 가격 이력 모달 */}
      <Dialog 
        open={historyModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
            // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
            setTimeout(() => {
              setHistoryModalOpen(false);
              if (!modalOpen) setSelectedIngredient(null);
              
              // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
              document.body.style.pointerEvents = '';
              document.body.style.touchAction = '';
              
              // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
              try {
                // aria-hidden 속성 제거 - 안전하게 처리
                document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
                  try {
                    if (el instanceof HTMLElement && !el.dataset.permanent && document.body.contains(el)) {
                      el.removeAttribute('aria-hidden');
                    }
                  } catch (e) {
                    // 속성 제거 중 오류 시 무시
                  }
                });
              } catch (e) {
                // 오류 발생 시 조용히 처리
                console.warn("모달 닫기 처리 중 오류:", e);
              }
            }, 100); // 시간을 0에서 100으로 증가
          } else {
            setHistoryModalOpen(open);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="price-history-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();
            
            // 이슈 #1236 해결: 터치 이벤트 차단 문제
            document.body.style.pointerEvents = '';
            document.body.style.touchAction = '';
            document.documentElement.style.touchAction = '';
            
            // 모든 포커스 제거
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onPointerDownOutside={(e) => {
            // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>가격 이력 - {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>
          <div id="price-history-description" className="sr-only">
            {selectedIngredient?.name}의 가격 변동 이력을 확인합니다
          </div>
          {selectedIngredient && (
            <IngredientPriceHistory
              companyId={companyId}
              ingredientId={selectedIngredient.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog 
        open={deleteConfirmOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
            // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
            setTimeout(() => {
              setDeleteConfirmOpen(false);
              setIngredientToDelete(null);
              
              // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
              document.body.style.pointerEvents = '';
              document.body.style.touchAction = '';
              
              // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
              try {
                // aria-hidden 속성 제거 - 안전하게 처리
                document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
                  try {
                    if (el instanceof HTMLElement && !el.dataset.permanent && document.body.contains(el)) {
                      el.removeAttribute('aria-hidden');
                    }
                  } catch (e) {
                    // 속성 제거 중 오류 시 무시
                  }
                });
              } catch (e) {
                // 오류 발생 시 조용히 처리
                console.warn("모달 닫기 처리 중 오류:", e);
              }
            }, 100); // 시간을 0에서 100으로 증가
          } else {
            setDeleteConfirmOpen(open);
          }
        }}
      >
        <DialogContent
          aria-describedby="delete-dialog-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();
            
            // 이슈 #1236 해결: 터치 이벤트 차단 문제
            document.body.style.pointerEvents = '';
            document.body.style.touchAction = '';
            document.documentElement.style.touchAction = '';
            
            // 모든 포커스 제거
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onPointerDownOutside={(e) => {
            // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>식재료 삭제</DialogTitle>
          </DialogHeader>
          <p className="py-4" id="delete-dialog-description">
            정말로 <span className="font-semibold">{ingredientToDelete?.name}</span> 식재료를 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteIngredient}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 