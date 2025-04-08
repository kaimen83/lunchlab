'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, PackageOpen, 
  ChevronDown, ChevronUp, LineChart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import IngredientForm from './IngredientForm';
import IngredientPriceHistory from './IngredientPriceHistory';

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 w-[320px]">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="식재료 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={handleAddIngredient}>
          <Plus className="mr-2 h-4 w-4" /> 식재료 추가
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
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
                <TableHead className="w-[160px] text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredIngredients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 식재료가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIngredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                    <TableCell>{formatNumber(ingredient.package_amount)}</TableCell>
                    <TableCell>{ingredient.unit}</TableCell>
                    <TableCell>{formatCurrency(ingredient.price)}</TableCell>
                    <TableCell>
                      {ingredient.memo1 || ingredient.memo2 ? (
                        <div className="max-w-[200px] truncate">
                          {ingredient.memo1}
                          {ingredient.memo1 && ingredient.memo2 && ', '}
                          {ingredient.memo2}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleViewPriceHistory(ingredient)}
                        title="가격 이력 보기"
                      >
                        <LineChart className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleEditIngredient(ingredient)}
                        title="수정하기"
                      >
                        <FilePen className="h-4 w-4" />
                      </Button>
                      {isOwnerOrAdmin && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleDeleteConfirm(ingredient)}
                          title="삭제하기"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '식재료 추가' : '식재료 수정'}
            </DialogTitle>
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

      {/* 식재료 삭제 확인 모달 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>식재료 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              <span className="font-bold">{ingredientToDelete?.name}</span> 식재료를 정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 영구적으로 삭제됩니다.
            </p>
          </div>
          <DialogFooter>
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

      {/* 식재료 가격 이력 모달 */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              가격 이력: {selectedIngredient?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedIngredient && (
            <IngredientPriceHistory 
              companyId={companyId}
              ingredientId={selectedIngredient.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 