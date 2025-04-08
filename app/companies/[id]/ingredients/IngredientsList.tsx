'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  ChevronDown, ChevronUp, LineChart, MoreVertical, Eye
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Ingredient {
  id: string;
  name: string;
  package_amount: number;
  unit: string;
  price: number;
  memo1?: string;
  memo2?: string;
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

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // 식재료 목록 로드
  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients`);
      
      if (!response.ok) {
        throw new Error('식재료 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setIngredients(data);
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
  };

  useEffect(() => {
    loadIngredients();
  }, [companyId]);

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
      ingredient.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ingredient.memo1 && ingredient.memo1.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ingredient.memo2 && ingredient.memo2.toLowerCase().includes(searchQuery.toLowerCase()))
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
    if (modalMode === 'create') {
      setIngredients(prev => [...prev, savedIngredient]);
    } else {
      setIngredients(prev => 
        prev.map(i => i.id === savedIngredient.id ? savedIngredient : i)
      );
    }
    
    setModalOpen(false);
    setSelectedIngredient(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat('ko-KR').format(number);
  };

  // 모바일 카드 아이템 렌더링
  const renderMobileCard = (ingredient: Ingredient) => (
    <div className="p-3 border-b border-gray-200 last:border-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-base">{ingredient.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewPriceHistory(ingredient)}>
              <LineChart className="h-4 w-4 mr-2" />
              <span>가격 이력</span>
            </DropdownMenuItem>
            {isOwnerOrAdmin && (
              <>
                <DropdownMenuItem onClick={() => handleEditIngredient(ingredient)}>
                  <FilePen className="h-4 w-4 mr-2" />
                  <span>수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-500" 
                  onClick={() => handleDeleteConfirm(ingredient)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>삭제</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2 px-1.5">포장량</Badge>
          <span>{formatNumber(ingredient.package_amount)} {ingredient.unit}</span>
        </div>
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2 px-1.5">가격</Badge>
          <span>{formatCurrency(ingredient.price)}</span>
        </div>
        {ingredient.memo1 && (
          <div className="col-span-2 mt-1 text-gray-600">
            {ingredient.memo1}
          </div>
        )}
      </div>
    </div>
  );

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
        <Button onClick={handleAddIngredient} className="w-full sm:w-auto mt-2 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" /> 식재료 추가
        </Button>
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
            <TableHeader>
              <TableRow>
                <TableHead 
                  onClick={() => toggleSort('name')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    이름
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => toggleSort('package_amount')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    포장량
                    {sortField === 'package_amount' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>단위</TableHead>
                <TableHead 
                  onClick={() => toggleSort('price')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    가격
                    {sortField === 'price' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>메모</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">로딩 중...</TableCell>
                </TableRow>
              ) : filteredIngredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 식재료가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIngredients.map(ingredient => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{formatNumber(ingredient.package_amount)}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell>{formatCurrency(ingredient.price)}</TableCell>
                    <TableCell>
                      {ingredient.memo1 || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleViewPriceHistory(ingredient)}>
                          <LineChart className="h-4 w-4" />
                        </Button>
                        
                        {isOwnerOrAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditIngredient(ingredient)}>
                              <FilePen className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(ingredient)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 식재료 추가/수정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === 'create' ? '식재료 추가' : '식재료 수정'}</DialogTitle>
          </DialogHeader>
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
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가격 이력 - {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <IngredientPriceHistory
              companyId={companyId}
              ingredientId={selectedIngredient.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>식재료 삭제</DialogTitle>
          </DialogHeader>
          <p className="py-4">
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