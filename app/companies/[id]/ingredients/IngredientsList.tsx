'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  MoreVertical, LineChart, FileSpreadsheet,
  SlidersHorizontal, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

// 분리된 컴포넌트 및 유틸리티 임포트
import { IngredientsListProps, Ingredient, PaginationInfo, VisibleColumns } from './types';
import { formatCurrency, formatNumber } from './utils';
import SearchInput from './components/SearchInput';
import MobileTable from './components/MobileTable';
import DesktopTable from './components/DesktopTable';
import Pagination from './components/Pagination';

// 기존 컴포넌트들 임포트
import IngredientForm from './IngredientForm';
import IngredientPriceHistory from './IngredientPriceHistory';
import BulkImportModal from './BulkImportModal';

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
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
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
  const handleEditIngredient = async (ingredient: Ingredient) => {
    setIsLoading(true);
    try {
      // 식재료 수정 전 서버에서 전체 정보를 다시 조회
      const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredient.id}`);
      
      if (!response.ok) {
        throw new Error('식재료 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const detailedIngredient = await response.json();
      
      // 전체 정보가 포함된 식재료로 모달 상태 설정
      setModalMode('edit');
      setSelectedIngredient(detailedIngredient);
      setModalOpen(true);
    } catch (error) {
      console.error('식재료 상세 정보 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 상세 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 식재료 삭제 확인 모달 열기
  const handleDeleteConfirm = (ingredient: Ingredient) => {
    setIngredientToDelete(ingredient);
    setDeleteConfirmOpen(true);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
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
            <Pagination 
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* 데스크톱 뷰 - 테이블 형태로 표시 */}
        <div className="hidden sm:block overflow-x-auto">
          <DesktopTable
            ingredients={sortedIngredients}
            isLoading={isLoading}
            visibleColumns={visibleColumns}
            expandedRows={expandedRows}
            detailedIngredients={detailedIngredients}
            loadingDetails={loadingDetails}
            sortField={sortField}
            sortDirection={sortDirection}
            isOwnerOrAdmin={isOwnerOrAdmin}
            toggleSort={toggleSort}
            toggleRowExpand={toggleRowExpand}
            handleEditIngredient={handleEditIngredient}
            handleViewPriceHistory={handleViewPriceHistory}
            handleDeleteConfirm={handleDeleteConfirm}
          />
          
          {/* 데스크톱 페이지네이션 */}
          <div className="p-4 border-t">
            <Pagination 
              pagination={pagination}
              onPageChange={handlePageChange}
            />
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