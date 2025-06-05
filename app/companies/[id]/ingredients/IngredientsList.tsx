'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// 분리된 컴포넌트 및 유틸리티 임포트
import { IngredientsListProps, Ingredient, PaginationInfo } from './types';
import SearchInput from './components/SearchInput';
import IngredientsSheetView from './components/IngredientsSheetView';

export default function IngredientsList({ companyId, userRole }: IngredientsListProps) {
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 페이지네이션 관련 상태
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0
  });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 현재 상태값을 참조하기 위한 ref
  const currentStateRef = useRef({
    sortField,
    sortDirection,
    paginationLimit: pagination.limit
  });
  
  // 상태 변경 시 ref 업데이트
  useEffect(() => {
    currentStateRef.current = {
      sortField,
      sortDirection,
      paginationLimit: pagination.limit
    };
  }, [sortField, sortDirection, pagination.limit]);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // 식재료 목록 로드 - useCallback으로 메모이제이션
  const loadIngredients = useCallback(async (page: number = 1, search: string = '', sort?: string, direction?: string, limit?: number) => {
    setIsLoading(true);
    
    try {
      // 모든 공급업체 목록을 먼저 가져옵니다
      const suppliersResponse = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
      let suppliersList: {id: string, name: string}[] = [];
      
      if (suppliersResponse.ok) {
        suppliersList = await suppliersResponse.json();
      }
      
      // 정렬 파라미터 설정 (매개변수 우선, 없으면 현재 상태 사용)
      const currentSort = sort || currentStateRef.current.sortField;
      const currentDirection = direction || currentStateRef.current.sortDirection;
      const currentLimit = limit || currentStateRef.current.paginationLimit;
      
      // 식재료 목록을 페이지네이션과 함께 가져옵니다
      const response = await fetch(
        `/api/companies/${companyId}/ingredients?page=${page}&limit=${currentLimit}&search=${encodeURIComponent(search)}&sort=${currentSort}&direction=${currentDirection}`
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
  }, [companyId, toast]); // 의존성을 최소화하여 불필요한 재생성 방지

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
    setPagination(prev => ({ ...prev, page: 1 }));
    loadIngredients(1, debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // 페이지 변경 시 데이터 로드 (검색어 변경으로 인한 페이지 리셋 제외)
  useEffect(() => {
    // 페이지가 1이 아닌 경우에만 데이터 로드 (검색어 변경으로 인한 중복 호출 방지)
    if (pagination.page > 1) {
      loadIngredients(pagination.page, debouncedSearchQuery);
    }
  }, [pagination.page]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 초기 데이터 로드 - 한 번만 실행
  useEffect(() => {
    loadIngredients(1, '');
  }, [companyId]); // companyId가 변경될 때만 초기 로드

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 정렬 변경 핸들러
  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSortField(field as keyof Ingredient);
    setSortDirection(direction);
    setPagination(prev => ({ ...prev, page: 1 })); // 정렬 변경 시 첫 페이지로
    loadIngredients(1, debouncedSearchQuery, field, direction);
  }, [debouncedSearchQuery, loadIngredients]);

  // 서버에서 이미 정렬된 상태로 받아오므로 클라이언트 측 정렬 불필요
  const sortedIngredients = ingredients;

  return (
    <div className="space-y-4">
      {/* 검색 영역 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          onSearch={executeSearch}
          totalCount={pagination.total}
        />
        
        {/* 기존 버튼들 제거 - 시트 뷰만 사용 */}
      </div>

      {/* 시트 뷰만 사용 */}
      <Card className="border border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
        <div className="p-4">
          <IngredientsSheetView
            companyId={companyId}
            ingredients={sortedIngredients}
            isLoading={isLoading}
            isOwnerOrAdmin={isOwnerOrAdmin}
            onRefresh={() => loadIngredients(pagination.page, debouncedSearchQuery)}
            pagination={pagination}
            onPageChange={handlePageChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
      </Card>
    </div>
  );
} 