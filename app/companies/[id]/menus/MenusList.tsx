'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, FileText, 
  ChevronDown, ChevronUp, LineChart, CookingPot 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import MenuForm from './MenuForm';
import MenuIngredientsView from './MenuIngredientsView';
import MenuPriceHistory from './MenuPriceHistory';

interface Menu {
  id: string;
  name: string;
  cost: number;
  price: number;
  description?: string;
  recipe?: string;
  serving_size?: number;
  created_at: string;
  updated_at?: string;
}

interface MenusListProps {
  companyId: string;
  userRole: string;
}

export default function MenusList({ companyId, userRole }: MenusListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Menu>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientsModalOpen, setIngredientsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // 메뉴 목록 로드
  const loadMenus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/menus`);
      
      if (!response.ok) {
        throw new Error('메뉴 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error('메뉴 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, [companyId]);

  // 정렬 처리
  const toggleSort = (field: keyof Menu) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬 및 필터링된 메뉴 목록
  const filteredMenus = menus
    .filter(menu => 
      menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (menu.description && menu.description.toLowerCase().includes(searchQuery.toLowerCase()))
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

  // 메뉴 추가 모달 열기
  const handleAddMenu = () => {
    setModalMode('create');
    setSelectedMenu(null);
    setModalOpen(true);
  };

  // 메뉴 수정 모달 열기
  const handleEditMenu = (menu: Menu) => {
    setModalMode('edit');
    setSelectedMenu(menu);
    setModalOpen(true);
  };

  // 메뉴 삭제 확인 모달 열기
  const handleDeleteConfirm = (menu: Menu) => {
    setMenuToDelete(menu);
    setDeleteConfirmOpen(true);
  };

  // 메뉴 삭제 처리
  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/${menuToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '메뉴 삭제에 실패했습니다.');
      }
      
      // 목록에서 해당 메뉴 제거
      setMenus(prev => prev.filter(i => i.id !== menuToDelete.id));
      
      toast({
        title: '삭제 완료',
        description: `${menuToDelete.name} 메뉴가 삭제되었습니다.`,
        variant: 'default',
      });
      
      setDeleteConfirmOpen(false);
      setMenuToDelete(null);
    } catch (error) {
      console.error('메뉴 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 식재료 보기 모달 열기
  const handleViewIngredients = (menu: Menu) => {
    setSelectedMenu(menu);
    setIngredientsModalOpen(true);
  };

  // 가격 이력 모달 열기
  const handleViewPriceHistory = (menu: Menu) => {
    setSelectedMenu(menu);
    setHistoryModalOpen(true);
  };

  // 메뉴 저장 후 처리
  const handleSaveMenu = (savedMenu: Menu) => {
    if (modalMode === 'create') {
      setMenus(prev => [...prev, savedMenu]);
    } else {
      setMenus(prev => 
        prev.map(i => i.id === savedMenu.id ? savedMenu : i)
      );
    }
    
    setModalOpen(false);
    setSelectedMenu(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 w-[320px]">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="메뉴 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={handleAddMenu}>
          <Plus className="mr-2 h-4 w-4" /> 메뉴 추가
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
                  onClick={() => toggleSort('cost')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    원가
                    {sortField === 'cost' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => toggleSort('price')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    판매가
                    {sortField === 'price' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>마진율</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[180px] text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredMenus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 메뉴가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMenus.map((menu) => {
                  // 마진율 계산 (마진 / 판매가) * 100
                  const margin = menu.price - menu.cost;
                  const marginPercent = menu.price > 0 
                    ? ((margin / menu.price) * 100).toFixed(1) 
                    : '0.0';
                  
                  return (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">{menu.name}</TableCell>
                      <TableCell>{formatCurrency(menu.cost)}</TableCell>
                      <TableCell>{formatCurrency(menu.price)}</TableCell>
                      <TableCell>{marginPercent}%</TableCell>
                      <TableCell>
                        {menu.description ? (
                          <div className="max-w-[200px] truncate">
                            {menu.description}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleViewIngredients(menu)}
                          title="식재료 보기"
                        >
                          <CookingPot className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleViewPriceHistory(menu)}
                          title="가격 이력 보기"
                        >
                          <LineChart className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleEditMenu(menu)}
                          title="수정하기"
                        >
                          <FilePen className="h-4 w-4" />
                        </Button>
                        {isOwnerOrAdmin && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteConfirm(menu)}
                            title="삭제하기"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 메뉴 추가/수정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '메뉴 추가' : '메뉴 수정'}
            </DialogTitle>
          </DialogHeader>
          <MenuForm
            companyId={companyId}
            menu={selectedMenu}
            mode={modalMode}
            onSave={handleSaveMenu}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 메뉴 삭제 확인 모달 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>메뉴 삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              <span className="font-bold">{menuToDelete?.name}</span> 메뉴를 정말 삭제하시겠습니까?
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
              onClick={handleDeleteMenu}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 식재료 보기 모달 */}
      <Dialog open={ingredientsModalOpen} onOpenChange={setIngredientsModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              식재료 구성: {selectedMenu?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuIngredientsView
              companyId={companyId}
              menuId={selectedMenu.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 메뉴 가격 이력 모달 */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              가격 이력: {selectedMenu?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuPriceHistory 
              companyId={companyId}
              menuId={selectedMenu.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 