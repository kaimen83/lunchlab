'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  // 식재료 선택을 위한 상태 추가
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  // 일괄 삭제 확인 모달 상태 추가
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
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
  const loadIngredients = useCallback(async (page: number = 1, search: string = '', sort?: string, direction?: string) => {
    setIsLoading(true);
    
    try {
      // 이전 검색 결과는 유지하여 깜빡임 방지 (모바일용 최적화)
      // 모든 공급업체 목록을 먼저 가져옵니다
      const suppliersResponse = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
      let suppliersList: {id: string, name: string}[] = [];
      
      if (suppliersResponse.ok) {
        suppliersList = await suppliersResponse.json();
      }
      
      // 정렬 파라미터 설정 (현재 상태 기준)
      const currentSort = sort || sortField;
      const currentDirection = direction || sortDirection;
      

      
      // 식재료 목록을 페이지네이션과 함께 가져옵니다
      const response = await fetch(
        `/api/companies/${companyId}/ingredients?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(search)}&sort=${currentSort}&direction=${currentDirection}`
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
  }, [companyId, pagination.limit, sortField, sortDirection, toast]);

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

  // 검색 입력값 변경 핸들러
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // 디바운스 처리를 여기서만 수행 (중복 상태 변경 방지)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(value);
    }, 300);
  }, []);

  // 검색 실행 (버튼 클릭 또는 엔터 키)
  const executeSearch = useCallback(() => {
    // 진행 중인 디바운스 타이머 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // 검색어를 즉시 적용
    setDebouncedSearchQuery(searchQuery);
  }, [searchQuery]);

  // 검색어 변경 시 첫 페이지로 데이터 로드
  useEffect(() => {
    // 검색어가 변경되면 첫 페이지로 데이터 로드
    // 페이지 번호 상태도 업데이트하여 UI와 동기화
    setPagination(prev => ({ ...prev, page: 1 }));
    loadIngredients(1, debouncedSearchQuery);
  }, [debouncedSearchQuery, loadIngredients]);

  // 페이지 변경 시 데이터 로드
  useEffect(() => {
    // 페이지가 변경되면 현재 검색어로 데이터 로드
    if (pagination.page > 1) {
      loadIngredients(pagination.page, debouncedSearchQuery);
    }
  }, [pagination.page, debouncedSearchQuery, loadIngredients]);

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
    const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
    const newField = field;
    
    setSortField(newField);
    setSortDirection(newDirection);
    
    // 정렬 변경 시 첫 페이지로 리셋하고 데이터 다시 로드
    setPagination(prev => ({ ...prev, page: 1 }));
    loadIngredients(1, debouncedSearchQuery, newField, newDirection);
  };

  // 서버에서 이미 정렬된 상태로 받아오므로 클라이언트 측 정렬 불필요
  const sortedIngredients = ingredients;

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
    setPagination(prev => ({ ...prev, page: newPage }));
    setSelectedIngredients([]); // 페이지 변경 시 선택 초기화
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
      
      // 페이지네이션 정보 업데이트
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1,
        totalPages: Math.ceil((prev.total - 1) / prev.limit)
      }));
      
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

  // 개별 식재료 선택/해제 토글 함수
  const handleToggleSelect = (ingredientId: string) => {
    setSelectedIngredients(prev => 
      prev.includes(ingredientId) 
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  // 현재 페이지의 모든 식재료 선택/해제 토글 함수
  const handleToggleSelectAll = () => {
    if (selectedIngredients.length === sortedIngredients.length) {
      setSelectedIngredients([]);
    } else {
      setSelectedIngredients(sortedIngredients.map(i => i.id));
    }
  };

  // 일괄 삭제 모달 열기
  const handleOpenBulkDelete = () => {
    if (selectedIngredients.length === 0) {
      toast({
        title: '식재료 미선택',
        description: '삭제할 식재료를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setBulkDeleteConfirmOpen(true);
  };

  // 일괄 삭제 실행 (Promise.all을 사용한 병렬 요청)
  const handleBulkDeleteIngredients = async () => {
    if (selectedIngredients.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // 식재료 사용 여부 확인 용도의 변수들
      const usedIngredients: {id: string, name: string}[] = [];
      const deletedCount = {success: 0, failed: 0};
      
      // 각 식재료별로 삭제 요청을 보내고 Promise 배열 생성
      const deletePromises = selectedIngredients.map(async (ingredientId) => {
        try {
          const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredientId}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            const data = await response.json();
            
            // 메뉴에서 사용 중인 식재료인 경우
            if (data.menuIds && data.menuIds.length > 0) {
              const ingredient = ingredients.find(i => i.id === ingredientId);
              if (ingredient) {
                usedIngredients.push({ id: ingredientId, name: ingredient.name });
              }
            }
            
            deletedCount.failed++;
            return { success: false, ingredientId };
          }
          
          deletedCount.success++;
          return { success: true, ingredientId };
        } catch (error) {
          console.error(`식재료 ${ingredientId} 삭제 오류:`, error);
          deletedCount.failed++;
          return { success: false, ingredientId };
        }
      });
      
      // 모든 삭제 요청이 완료될 때까지 대기
      const results = await Promise.all(deletePromises);
      
      // 삭제 성공한 식재료만 목록에서 제거
      const successfullyDeletedIds = results
        .filter(result => result.success)
        .map(result => result.ingredientId);
      
      if (successfullyDeletedIds.length > 0) {
        setIngredients(prev => prev.filter(i => !successfullyDeletedIds.includes(i.id)));
        
        // 페이지네이션 정보 업데이트
        setPagination(prev => ({
          ...prev,
          total: prev.total - successfullyDeletedIds.length,
          totalPages: Math.ceil((prev.total - successfullyDeletedIds.length) / prev.limit)
        }));
        
        // 성공 메시지 표시
        toast({
          title: '삭제 완료',
          description: `${successfullyDeletedIds.length}개의 식재료가 삭제되었습니다.`,
          variant: 'default',
        });
      }
      
      // 일부 식재료가 사용 중인 경우 추가 메시지 표시
      if (usedIngredients.length > 0) {
        const usedNames = usedIngredients.map(i => i.name).join(', ');
        toast({
          title: '일부 식재료 삭제 실패',
          description: `다음 식재료는 메뉴에서 사용 중이므로 삭제할 수 없습니다: ${usedNames}`,
          variant: 'destructive',
        });
      }
      
      // 선택 초기화 및 모달 닫기
      setSelectedIngredients([]);
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      console.error('식재료 일괄 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 일괄 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
          {selectedIngredients.length > 0 && (
            <span className="text-sm text-muted-foreground mr-2">
              {selectedIngredients.length}개 선택됨
            </span>
          )}
          
          {/* 식재료 추가 버튼 - 모든 사용자에게 허용 */}
          <Button onClick={handleAddIngredient} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            식재료 추가
          </Button>
          
          {/* 부가 기능 드롭다운 - 모든 사용자에게 허용 */}
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
              {/* 일괄 삭제는 관리자/소유자만 허용 */}
              {isOwnerOrAdmin && (
                <DropdownMenuItem 
                  onClick={handleOpenBulkDelete}
                  className={selectedIngredients.length > 0 ? "text-destructive focus:text-destructive" : ""}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>일괄 삭제{selectedIngredients.length > 0 ? ` (${selectedIngredients.length})` : ''}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
            selectedIngredients={selectedIngredients}
            handleToggleSelect={handleToggleSelect}
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
            selectedIngredients={selectedIngredients}
            handleToggleSelect={handleToggleSelect}
            handleToggleSelectAll={handleToggleSelectAll}
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
      
      {/* 일괄 삭제 확인 모달 */}
      <Dialog 
        open={bulkDeleteConfirmOpen} 
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              식재료 일괄 삭제
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              선택한 <strong>{selectedIngredients.length}개</strong>의 식재료를 정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              이 작업은 되돌릴 수 없으며, 메뉴에 사용되지 않은 식재료만 삭제됩니다.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setBulkDeleteConfirmOpen(false)}
            >
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDeleteIngredients}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  처리 중...
                </>
              ) : '삭제'}
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