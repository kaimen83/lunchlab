'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  ChevronDown, ChevronUp, LineChart, MoreVertical, Eye,
  Settings, X, ChevronRight, Info, FileSpreadsheet,
  SlidersHorizontal, Command, ArrowUpDown, Filter,
  ChevronLeft
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

// 페이지네이션 정보 인터페이스
interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface IngredientsListProps {
  companyId: string;
  userRole: string;
}

// 검색 입력 컴포넌트 분리 (메모이제이션)
const SearchInput = memo(({ 
  value, 
  onChange, 
  onSearch,
  totalCount
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onSearch: () => void;
  totalCount?: number 
}) => {
  // 로컬 입력값 상태
  const [inputValue, setInputValue] = useState(value);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 외부 value prop 변경 시 내부 상태 동기화
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // 입력 핸들러
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // 즉시 로컬 상태 업데이트 (타이핑 반응성 유지)
    
    // 상위 컴포넌트 상태 업데이트는 디바운스 적용
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    
    inputTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 500);
  };
  
  // 엔터 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
        inputTimeoutRef.current = null;
      }
      onChange(inputValue);
      onSearch();
    }
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="relative flex-1 sm:max-w-md">
      <div className="flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="식재료 검색..." 
            className="pl-9 pr-14"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 top-0 h-full"
              onClick={() => {
                setInputValue('');
                onChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button 
          variant="secondary"
          className="ml-2"
          onClick={onSearch}
        >
          검색
        </Button>
      </div>
      <div className="mt-1 text-xs text-muted-foreground ml-1">
        {totalCount !== undefined && totalCount > 0 && (
          <span>전체 {totalCount}건</span>
        )}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

// 모바일 테이블 컴포넌트 추가
const MobileTable = ({ 
  ingredients, 
  isLoading, 
  searchQuery, 
  isOwnerOrAdmin, 
  handleAddIngredient,
  handleEditIngredient,
  handleViewPriceHistory,
  handleDeleteConfirm,
  formatCurrency,
  formatNumber
}: { 
  ingredients: Ingredient[]; 
  isLoading: boolean; 
  searchQuery: string; 
  isOwnerOrAdmin: boolean; 
  handleAddIngredient: () => void;
  handleEditIngredient: (ingredient: Ingredient) => void;
  handleViewPriceHistory: (ingredient: Ingredient) => void;
  handleDeleteConfirm: (ingredient: Ingredient) => void;
  formatCurrency: (amount: number) => string;
  formatNumber: (number: number) => string;
}) => {
  // 모바일에서 확장된 행 상태 관리 (한 번에 하나만 열림)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };
  
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
                onClick={() => toggleExpand(ingredient.id)}
              >
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
                        toggleExpand(ingredient.id);
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
              
              {/* 확장된 상세 정보 행 */}
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
                          <Badge variant={
                            ingredient.stock_grade === 'A' ? 'default' :
                            ingredient.stock_grade === 'B' ? 'secondary' :
                            ingredient.stock_grade === 'C' ? 'outline' : 'destructive'
                          } className="h-5 text-xs">{ingredient.stock_grade}</Badge>
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

export default function IngredientsList({ companyId, userRole }: IngredientsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
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
  // 카드 확장 상태 관리 추가
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
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
  
  // 페이지네이션 관련 상태 추가
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0
  });
  // 상세 정보 상태 (아코디언 지연 로딩용)
  const [detailedIngredients, setDetailedIngredients] = useState<Record<string, Ingredient>>({});
  // 현재 로딩 중인 상세 정보 ID 추적
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // 식재료 목록 로드 - useCallback으로 메모이제이션
  const loadIngredients = useCallback(async (page: number = 1, search: string = '') => {
    setIsLoading(true);
    try {
      // 모든 공급업체 목록을 먼저 가져옵니다
      const suppliersResponse = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
      let suppliersList: {id: string, name: string}[] = [];
      
      if (suppliersResponse.ok) {
        suppliersList = await suppliersResponse.json();
      }
      
      // 식재료 목록을 페이지네이션과 함께 가져옵니다
      const response = await fetch(
        `/api/companies/${companyId}/ingredients?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}`
      );
      
      if (!response.ok) {
        throw new Error('식재료 목록을 불러오는데 실패했습니다.');
      }
      
      const { ingredients: data, pagination: paginationData } = await response.json();
      
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
      setPagination(paginationData);
      
      // 페이지가 변경되면 확장된 행 상태 초기화
      setExpandedRows({});
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
  }, [companyId, pagination.limit, toast]);

  // 특정 식재료의 상세 정보를 로드하는 함수
  const loadIngredientDetails = useCallback(async (ingredientId: string) => {
    // 이미 로딩 중이거나 상세 정보가 있으면 중복 요청 방지
    if (loadingDetails[ingredientId] || detailedIngredients[ingredientId]) {
      return;
    }
    
    setLoadingDetails(prev => ({ ...prev, [ingredientId]: true }));
    
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredientId}`);
      
      if (!response.ok) {
        throw new Error('식재료 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const detailedIngredient = await response.json();
      
      setDetailedIngredients(prev => ({
        ...prev,
        [ingredientId]: detailedIngredient
      }));
    } catch (error) {
      console.error('식재료 상세 정보 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 상세 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
      
      // 에러 발생 시 확장된 행에서 제거
      setExpandedRows(prev => {
        const newState = { ...prev };
        delete newState[ingredientId];
        return newState;
      });
    } finally {
      setLoadingDetails(prev => {
        const newState = { ...prev };
        delete newState[ingredientId];
        return newState;
      });
    }
  }, [companyId, loadingDetails, detailedIngredients, toast]);

  // 검색 실행 (버튼 클릭 또는 엔터 키)
  const executeSearch = useCallback(() => {
    setDebouncedSearchQuery(searchQuery);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, [searchQuery]);

  // 검색 입력값 변경 핸들러
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setDebouncedSearchQuery(value);
  }, []);

  // 검색어 변경 시 첫 페이지로 데이터 로드
  useEffect(() => {
    loadIngredients(1, debouncedSearchQuery);
  }, [debouncedSearchQuery, loadIngredients]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 초기 데이터 로드
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

  // 정렬된 식재료 목록 (클라이언트 측 정렬만 적용)
  const sortedIngredients = [...ingredients].sort((a, b) => {
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

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return;
    }
    loadIngredients(newPage, searchQuery);
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

  // 행 확장 토글 함수 (아코디언)
  const toggleRowExpand = (ingredientId: string) => {
    const newExpandedRows = { ...expandedRows };
    
    if (newExpandedRows[ingredientId]) {
      // 이미 확장된 경우 닫기
      delete newExpandedRows[ingredientId];
    } else {
      // 확장하는 경우, 상세 정보 로드
      newExpandedRows[ingredientId] = true;
      
      // 상세 정보가 없는 경우에만 로드
      if (!detailedIngredients[ingredientId]) {
        loadIngredientDetails(ingredientId);
      }
    }
    
    setExpandedRows(newExpandedRows);
  };

  // 카드 확장 토글 처리 함수
  const toggleCardExpand = (ingredientId: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [ingredientId]: !prev[ingredientId]
    }));
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
    sortedIngredients.map(ingredient => {
      const isExpanded = !!expandedRows[ingredient.id];
      const detailedData = detailedIngredients[ingredient.id] || ingredient;
      const isDetailLoading = loadingDetails[ingredient.id];
      
      return (
        <React.Fragment key={ingredient.id}>
          {/* 기본 행 */}
          <TableRow className={isExpanded ? 'bg-muted/50' : ''}>
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
              <TableCell colSpan={12} className="px-4 py-3">
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
    })
  );

  // 모바일 카드 렌더링 함수 개선
  const renderMobileCard = (ingredient: Ingredient) => {
    const isExpanded = expandedCardIds[ingredient.id] || false;
    
    return (
      <div 
        className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100 transition-all duration-200"
        style={{ borderLeftWidth: ingredient.stock_grade ? '4px' : '1px', 
                 borderLeftColor: ingredient.stock_grade === 'A' ? 'hsl(var(--destructive))' : 
                                ingredient.stock_grade === 'B' ? 'hsl(var(--secondary))' : 
                                ingredient.stock_grade === 'C' ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
      >
        {/* 카드 헤더 - 항상 표시되는 부분 */}
        <div 
          className="p-3 flex flex-col gap-1.5"
          onClick={() => toggleCardExpand(ingredient.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">{ingredient.name}</h3>
              {ingredient.code_name && (
                <p className="text-xs text-muted-foreground truncate">
                  코드: {ingredient.code_name}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {isOwnerOrAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
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
              
              <div onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full"
                  onClick={() => toggleCardExpand(ingredient.id)}>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* 기본 정보 영역 - 항상 표시됨 */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center">
              <Badge variant="outline" className="flex-grow-0 mr-1.5 font-medium">
                {formatCurrency(ingredient.price)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                / {ingredient.package_amount}{ingredient.unit === 'l' ? 'ml' : ingredient.unit}
              </span>
            </div>
            
            {ingredient.supplier && (
              <div className="flex items-center text-xs text-muted-foreground">
                <span>{ingredient.supplier}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 상세 정보 영역 - 확장 시에만 표시 */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-100 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {ingredient.items_per_box && (
                <div className="flex items-center gap-1.5">
                  <PackageOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    <span className="text-muted-foreground mr-1">박스:</span>
                    {formatNumber(ingredient.items_per_box)}개
                  </span>
                </div>
              )}
              
              {ingredient.origin && (
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    <span className="text-muted-foreground mr-1">원산지:</span>
                    {ingredient.origin}
                  </span>
                </div>
              )}
              
              {ingredient.calories && (
                <div className="flex items-center gap-1.5">
                  <LineChart className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    <span className="text-muted-foreground mr-1">칼로리:</span>
                    {ingredient.calories} kcal
                  </span>
                </div>
              )}
              
              {(ingredient.protein || ingredient.fat || ingredient.carbs) && (
                <div className="col-span-2 mt-1">
                  <div className="flex flex-wrap gap-1.5">
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
                </div>
              )}
              
              {ingredient.allergens && (
                <div className="col-span-2 mt-1">
                  <p className="text-xs">
                    <span className="text-muted-foreground mr-1">알러지:</span>
                    {ingredient.allergens}
                  </p>
                </div>
              )}
              
              {ingredient.memo1 && (
                <div className="col-span-2 mt-1">
                  <p className="text-xs">
                    <span className="text-muted-foreground mr-1">메모:</span>
                    {ingredient.memo1}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-2 flex justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewPriceHistory(ingredient);
                }}
              >
                <LineChart className="h-3 w-3 mr-1" />
                가격 이력
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 페이지네이션 UI 렌더링
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          전체 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
          {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
        </div>
        
        <nav className="flex items-center space-x-1" aria-label="페이지네이션">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1}
            aria-label="첫 페이지"
          >
            <ChevronLeft className="h-3 w-3" />
            <ChevronLeft className="h-3 w-3 -ml-2" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              // 현재 페이지를 중심으로 표시할 페이지 계산
              let pageToShow;
              if (pagination.totalPages <= 5) {
                // 전체 페이지가 5개 이하면 모두 표시
                pageToShow = i + 1;
              } else if (pagination.page <= 3) {
                // 현재 페이지가 1~3이면 1~5 표시
                pageToShow = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                // 현재 페이지가 마지막에 가까우면 마지막 5개 표시
                pageToShow = pagination.totalPages - 4 + i;
              } else {
                // 그 외에는 현재 페이지 중심으로 앞뒤 2개씩 표시
                pageToShow = pagination.page - 2 + i;
              }
              
              const isCurrentPage = pageToShow === pagination.page;
              
              return (
                <Button
                  key={pageToShow}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="icon"
                  className={`h-8 w-8 rounded-md ${isCurrentPage ? "pointer-events-none" : ""}`}
                  onClick={() => handlePageChange(pageToShow)}
                  aria-current={isCurrentPage ? "page" : undefined}
                  aria-label={`${pageToShow} 페이지`}
                >
                  {pageToShow}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            aria-label="마지막 페이지"
          >
            <ChevronRight className="h-3 w-3" />
            <ChevronRight className="h-3 w-3 -ml-2" />
          </Button>
        </nav>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 제목 및 설명 영역 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">식재료 관리</h2>
        <p className="text-muted-foreground mb-6 hidden sm:block">
          식당에서 사용하는 식재료를 등록하고 관리하세요. 등록된 식재료는 메뉴 구성과 원가 관리에 활용됩니다.
        </p>
      </div>
      
      {/* 상단 검색 및 추가 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <SearchInput 
          value={searchQuery}
          onChange={handleSearchChange}
          onSearch={executeSearch}
          totalCount={pagination.total}
        />
        
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

      <Card className="border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
        {/* 모바일 뷰 - 테이블 형태로 표시 */}
        <div className="block sm:hidden">
          <MobileTable
            ingredients={sortedIngredients}
            isLoading={isLoading}
            searchQuery={searchQuery}
            isOwnerOrAdmin={isOwnerOrAdmin}
            handleAddIngredient={handleAddIngredient}
            handleEditIngredient={handleEditIngredient}
            handleViewPriceHistory={handleViewPriceHistory}
            handleDeleteConfirm={handleDeleteConfirm}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
          
          {/* 모바일 페이지네이션 */}
          <div className="p-4 border-t">
            {renderPagination()}
          </div>
        </div>

        {/* 데스크톱 뷰 - 테이블 형태로 표시 */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            {renderTableHeader()}
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedIngredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                renderTableRows()
              )}
            </TableBody>
          </Table>
          
          {/* 데스크톱 페이지네이션 */}
          <div className="p-4 border-t">
            {renderPagination()}
          </div>
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
        onSuccess={() => {
          loadIngredients();
          setBulkImportModalOpen(false);
        }}
      />
    </div>
  );
} 