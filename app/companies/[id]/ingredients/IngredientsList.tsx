'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  ChevronDown, ChevronUp, LineChart, MoreVertical, Eye,
  Settings, X, ChevronRight, Info, FileSpreadsheet,
  SlidersHorizontal, Command, ArrowUpDown, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Command as CommandPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import React from 'react';
import BulkImportModal from './BulkImportModal';

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
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);

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

  // 테이블 헤더 렌더링 함수 개선
  const renderTableHeader = () => (
    <TableHeader className="bg-muted/20">
      <TableRow>
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

  // 테이블 행 렌더링 함수 개선
  const renderTableRows = () => (
    <TableBody>
      {isLoading ? (
        // 로딩 중 표시
        <TableRow>
          <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} 
            className="h-24 text-center text-muted-foreground"
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>식재료 로딩 중...</span>
            </div>
          </TableCell>
        </TableRow>
      ) : filteredIngredients.length === 0 ? (
        // 결과 없음 표시
        <TableRow>
          <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} 
            className="h-24 text-center"
          >
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p>'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
                </>
              ) : (
                <>
                  <PackageOpen className="h-10 w-10 mb-2 opacity-20" />
                  <p>등록된 식재료가 없습니다.</p>
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
          </TableCell>
        </TableRow>
      ) : (
        // 데이터 행 표시
        filteredIngredients.map(ingredient => (
          <React.Fragment key={ingredient.id}>
            <TableRow className={expandedRows[ingredient.id] ? "bg-muted/10" : ""}>
              {/* 확장 버튼 */}
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => toggleRowExpand(ingredient.id)}
                  className="h-8 w-8 rounded-full p-0 hover:bg-muted/30"
                >
                  {expandedRows[ingredient.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
              
              {/* 식재료명 */}
              {visibleColumns.name && (
                <TableCell className="font-medium">
                  {ingredient.name}
                </TableCell>
              )}
              
              {/* 코드명 */}
              {visibleColumns.code_name && (
                <TableCell>
                  {ingredient.code_name || '-'}
                </TableCell>
              )}
              
              {/* 식재료 업체 */}
              {visibleColumns.supplier && (
                <TableCell>
                  {ingredient.supplier || '-'}
                </TableCell>
              )}
              
              {/* 포장 단위 */}
              {visibleColumns.package_amount && (
                <TableCell>
                  {ingredient.package_amount}{ingredient.unit === 'l' ? 'ml' : ingredient.unit}
                </TableCell>
              )}
              
              {/* 가격 */}
              {visibleColumns.price && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{formatCurrency(ingredient.price)}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full p-0 hover:bg-muted/30"
                            onClick={() => handleViewPriceHistory(ingredient)}
                          >
                            <LineChart className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>가격 이력 보기</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              )}
              
              {/* 박스당 갯수 */}
              {visibleColumns.items_per_box && (
                <TableCell>
                  {ingredient.items_per_box ? formatNumber(ingredient.items_per_box) : '-'}
                </TableCell>
              )}
              
              {/* 재고관리 등급 */}
              {visibleColumns.stock_grade && (
                <TableCell>
                  {ingredient.stock_grade ? (
                    <Badge variant={
                      ingredient.stock_grade === 'A' ? 'destructive' : 
                      ingredient.stock_grade === 'B' ? 'secondary' : 
                      ingredient.stock_grade === 'C' ? 'default' : 
                      'outline'
                    }>
                      {ingredient.stock_grade}
                    </Badge>
                  ) : '-'}
                </TableCell>
              )}
              
              {/* 원산지 */}
              {visibleColumns.origin && (
                <TableCell>
                  {ingredient.origin || '-'}
                </TableCell>
              )}
              
              {/* 칼로리 */}
              {visibleColumns.calories && (
                <TableCell>
                  {ingredient.calories ? `${ingredient.calories} kcal` : '-'}
                </TableCell>
              )}
              
              {/* 영양성분 */}
              {visibleColumns.nutrition && (
                <TableCell className="max-w-[150px] truncate">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="text-left w-full truncate">
                        {(ingredient.protein || ingredient.fat || ingredient.carbs) ? (
                          <span className="text-xs">
                            {ingredient.protein ? `단백질 ${ingredient.protein}g` : ''}
                            {ingredient.fat ? (ingredient.protein ? ', ' : '') + `지방 ${ingredient.fat}g` : ''}
                            {ingredient.carbs ? ((ingredient.protein || ingredient.fat) ? ', ' : '') + `탄수화물 ${ingredient.carbs}g` : ''}
                          </span>
                        ) : '-'}
                      </TooltipTrigger>
                      {(ingredient.protein || ingredient.fat || ingredient.carbs) && (
                        <TooltipContent>
                          <div className="space-y-1">
                            {ingredient.protein && <p>단백질: {ingredient.protein}g</p>}
                            {ingredient.fat && <p>지방: {ingredient.fat}g</p>}
                            {ingredient.carbs && <p>탄수화물: {ingredient.carbs}g</p>}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              )}
              
              {/* 알러지 유발물질 */}
              {visibleColumns.allergens && (
                <TableCell className="max-w-[150px] truncate">
                  {ingredient.allergens ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-left w-full truncate">
                          {ingredient.allergens}
                        </TooltipTrigger>
                        <TooltipContent>
                          {ingredient.allergens}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : '-'}
                </TableCell>
              )}
              
              {/* 작업 버튼 */}
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {isOwnerOrAdmin && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditIngredient(ingredient)}
                              className="h-8 w-8 p-0"
                            >
                              <FilePen className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>편집</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteConfirm(ingredient)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>삭제</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
            
            {/* 확장 행 */}
            {expandedRows[ingredient.id] && (
              <TableRow key={`${ingredient.id}-expanded`}>
                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="bg-muted/5 px-6 py-3 border-t border-muted/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!visibleColumns.origin && ingredient.origin && (
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">원산지:</span>
                        <p>{ingredient.origin}</p>
                      </div>
                    )}
                    {!visibleColumns.calories && ingredient.calories && (
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">칼로리:</span>
                        <p>{ingredient.calories} kcal</p>
                      </div>
                    )}
                    {!visibleColumns.nutrition && (ingredient.protein || ingredient.fat || ingredient.carbs) && (
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">영양성분:</span>
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
                        <span className="font-medium text-sm text-muted-foreground">알러지 유발물질:</span>
                        <p>{ingredient.allergens}</p>
                      </div>
                    )}
                    {ingredient.memo1 && (
                      <div>
                        <span className="font-medium text-sm text-muted-foreground">메모:</span>
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

  // 모바일 카드 렌더링 함수 개선
  const renderMobileCard = (ingredient: Ingredient) => (
    <Card className="mb-3 overflow-hidden border-0 shadow-sm hover:shadow transition-shadow">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-base">{ingredient.name}</h3>
            {ingredient.code_name && (
              <div className="text-xs text-muted-foreground mt-0.5">
                코드: {ingredient.code_name}
              </div>
            )}
          </div>
          
          {/* 모바일 액션 버튼 */}
          {isOwnerOrAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditIngredient(ingredient)}>
                  <FilePen className="mr-2 h-4 w-4" />
                  <span>편집</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewPriceHistory(ingredient)}>
                  <LineChart className="mr-2 h-4 w-4" />
                  <span>가격 이력</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteConfirm(ingredient)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>삭제</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="mt-2">
          <div className="flex items-center">
            <Badge className="mr-2" variant="outline">
              {formatCurrency(ingredient.price)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              / {ingredient.package_amount}{ingredient.unit === 'l' ? 'ml' : ingredient.unit}
            </span>
            
            {ingredient.stock_grade && (
              <Badge 
                className="ml-auto" 
                variant={
                  ingredient.stock_grade === 'A' ? 'destructive' : 
                  ingredient.stock_grade === 'B' ? 'secondary' : 
                  ingredient.stock_grade === 'C' ? 'default' : 
                  'outline'
                }
              >
                등급 {ingredient.stock_grade}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">공급업체</span>
            <span>{ingredient.supplier || '-'}</span>
          </div>
          
          {ingredient.items_per_box && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">박스당 갯수</span>
              <span>{formatNumber(ingredient.items_per_box)}개</span>
            </div>
          )}
          
          {ingredient.origin && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">원산지</span>
              <span>{ingredient.origin}</span>
            </div>
          )}
          
          {ingredient.calories && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">칼로리</span>
              <span>{ingredient.calories} kcal</span>
            </div>
          )}
        </div>
        
        {(ingredient.protein || ingredient.fat || ingredient.carbs || ingredient.allergens) && (
          <div className="mt-3 pt-2 border-t">
            {(ingredient.protein || ingredient.fat || ingredient.carbs) && (
              <div className="mb-2">
                <span className="text-xs text-muted-foreground block mb-1">영양성분</span>
                <div className="flex flex-wrap gap-2">
                  {ingredient.protein && (
                    <Badge variant="outline" className="text-xs">
                      단백질 {ingredient.protein}g
                    </Badge>
                  )}
                  {ingredient.fat && (
                    <Badge variant="outline" className="text-xs">
                      지방 {ingredient.fat}g
                    </Badge>
                  )}
                  {ingredient.carbs && (
                    <Badge variant="outline" className="text-xs">
                      탄수화물 {ingredient.carbs}g
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {ingredient.allergens && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">알러지 유발물질</span>
                <p className="text-xs">{ingredient.allergens}</p>
              </div>
            )}
          </div>
        )}
        
        {ingredient.memo1 && (
          <div className="mt-3 pt-2 border-t">
            <span className="text-xs text-muted-foreground block mb-1">메모</span>
            <p className="text-sm">{ingredient.memo1}</p>
          </div>
        )}
      </div>
      
      <div className="bg-muted/5 py-2 px-4 flex justify-end gap-2 border-t">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 px-2 text-xs"
          onClick={() => handleViewPriceHistory(ingredient)}
        >
          <LineChart className="h-3 w-3 mr-1" />
          가격 이력
        </Button>
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
    <div className="space-y-6">
      {/* 제목 및 설명 영역 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">식재료 관리</h2>
        <p className="text-muted-foreground mb-6">
          식당에서 사용하는 식재료를 등록하고 관리하세요. 등록된 식재료는 메뉴 구성과 원가 관리에 활용됩니다.
        </p>
      </div>
      
      {/* 상단 검색 및 추가 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="식재료 검색..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 items-center">
          {isOwnerOrAdmin && (
            <Button onClick={handleAddIngredient} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              식재료 추가
            </Button>
          )}
          
          {/* 부가 기능 드롭다운 */}
          {isOwnerOrAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="ml-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>관리 옵션</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBulkImportModalOpen(true)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>일괄 추가</span>
                </DropdownMenuItem>
                
                {/* 칼럼 설정 서브메뉴 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start px-2">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      <span>칼럼 설정</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" className="w-56">
                    <DropdownMenuLabel>표시할 칼럼 선택</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.name}
                      onCheckedChange={(checked) => 
                        setVisibleColumns({...visibleColumns, name: checked})
                      }
                      disabled={true} // 필수 칼럼
                    >
                      식재료 명
                    </DropdownMenuCheckboxItem>
                    {/* 나머지 칼럼 체크박스 아이템들 */}
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
                    {/* 추가 칼럼들... */}
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 모바일 전용 FAB 버튼 */}
      {isOwnerOrAdmin && (
        <div className="sm:hidden fixed right-4 bottom-4 flex flex-col-reverse gap-2 z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-12 w-12 shadow-md">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-xl">
              <SheetHeader className="text-left pb-4">
                <SheetTitle>식재료 관리</SheetTitle>
                <SheetDescription>다양한 관리 옵션을 선택하세요</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <Button onClick={() => setBulkImportModalOpen(true)} variant="outline" className="w-full justify-start">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>일괄 추가</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      <span>칼럼 설정</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {/* 여기에 칼럼 체크박스 아이템들을 위와 동일하게 복사 (코드 중복 방지를 위해 생략) */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SheetFooter className="flex flex-row justify-end gap-2">
                <SheetClose asChild>
                  <Button variant="ghost">닫기</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          <Button onClick={handleAddIngredient} size="icon" className="rounded-full h-14 w-14 shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <Card className="border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
        {/* 모바일 뷰 - 카드 형태로 표시 */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>식재료 로딩 중...</span>
              </div>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-base">'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
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
          ) : (
            <div className="px-2 py-2 divide-y divide-border">
              {filteredIngredients.map(ingredient => (
                <div key={ingredient.id} className="py-1">
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
        <DialogContent className="sm:max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '식재료 추가' : '식재료 수정'}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2 -mr-2">
            <IngredientForm 
              companyId={companyId} 
              ingredient={selectedIngredient}
              onSave={handleSaveIngredient}
              mode={modalMode}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 가격 이력 모달 */}
      <Dialog 
        open={historyModalOpen} 
        onOpenChange={setHistoryModalOpen}
      >
        <DialogContent className="sm:max-w-md md:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedIngredient?.name} 가격 이력
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedIngredient && (
              <IngredientPriceHistory
                companyId={companyId}
                ingredientId={selectedIngredient.id}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 확인 모달 */}
      <Dialog 
        open={deleteConfirmOpen} 
        onOpenChange={setDeleteConfirmOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              식재료 삭제
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              <strong>{ingredientToDelete?.name}</strong> 식재료를 정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 삭제됩니다.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
            >
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteIngredient}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 일괄 추가 모달 */}
      <BulkImportModal
        open={bulkImportModalOpen}
        onOpenChange={setBulkImportModalOpen}
        companyId={companyId}
        onImportComplete={loadIngredients}
      />
    </div>
  );
} 