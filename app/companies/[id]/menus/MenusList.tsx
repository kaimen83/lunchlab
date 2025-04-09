'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, FileText, 
  ChevronDown, ChevronUp, LineChart, CookingPot, PackageOpen, MoreVertical 
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Menu {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
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
        
        // 식단 계획에서 사용 중인 경우 특별 처리
        if (response.status === 409) {
          throw new Error(data.error || '해당 메뉴가 식단 계획에서 사용 중입니다.');
        }
        
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
      setDeleteConfirmOpen(false);
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

  // 모바일 카드 아이템 렌더링
  const renderMobileCard = (menu: Menu) => (
    <div className="p-3 border-b border-gray-200 last:border-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-base">{menu.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewIngredients(menu)}>
              <PackageOpen className="h-4 w-4 mr-2" />
              <span>식재료 보기</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewPriceHistory(menu)}>
              <LineChart className="h-4 w-4 mr-2" />
              <span>가격 이력</span>
            </DropdownMenuItem>
            {isOwnerOrAdmin && (
              <>
                <DropdownMenuItem onClick={() => handleEditMenu(menu)}>
                  <FilePen className="h-4 w-4 mr-2" />
                  <span>수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-500" 
                  onClick={() => handleDeleteConfirm(menu)}
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
          <Badge variant="outline" className="mr-2 px-1.5">원가</Badge>
          <span>{formatCurrency(menu.cost_price)}</span>
        </div>
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2 px-1.5">판매가</Badge>
          <span>{formatCurrency(menu.selling_price)}</span>
        </div>
        {menu.description && (
          <div className="col-span-2 mt-1 text-gray-600">
            {menu.description}
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
            placeholder="메뉴 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={handleAddMenu} className="w-full sm:w-auto mt-2 sm:mt-0">
          <Plus className="mr-2 h-4 w-4" /> 메뉴 추가
        </Button>
      </div>

      <Card>
        {/* 모바일 뷰 - 카드 형태로 표시 */}
        <div className="block sm:hidden">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">로딩 중...</div>
          ) : filteredMenus.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 메뉴가 없습니다.'}
            </div>
          ) : (
            <div>
              {filteredMenus.map(menu => renderMobileCard(menu))}
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
                  onClick={() => toggleSort('cost_price')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    원가
                    {sortField === 'cost_price' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => toggleSort('selling_price')}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    판매가
                    {sortField === 'selling_price' && (
                      sortDirection === 'asc' ? 
                      <ChevronUp className="ml-1 h-4 w-4" /> : 
                      <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>설명</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">로딩 중...</TableCell>
                </TableRow>
              ) : filteredMenus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 메뉴가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMenus.map(menu => (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell>{formatCurrency(menu.cost_price)}</TableCell>
                    <TableCell>{formatCurrency(menu.selling_price)}</TableCell>
                    <TableCell>
                      {menu.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleViewIngredients(menu)}>
                          <PackageOpen className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewPriceHistory(menu)}>
                          <LineChart className="h-4 w-4" />
                        </Button>
                        
                        {isOwnerOrAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditMenu(menu)}>
                              <FilePen className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(menu)}>
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

      {/* 메뉴 추가/수정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === 'create' ? '메뉴 추가' : '메뉴 수정'}</DialogTitle>
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

      {/* 재료 보기 모달 */}
      <Dialog open={ingredientsModalOpen} onOpenChange={setIngredientsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>메뉴 식재료 - {selectedMenu?.name}</DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuIngredientsView
              companyId={companyId}
              menuId={selectedMenu.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 가격 이력 모달 */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가격 이력 - {selectedMenu?.name}</DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuPriceHistory
              companyId={companyId}
              menuId={selectedMenu.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>메뉴 삭제</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            정말로 <span className="font-semibold">{menuToDelete?.name}</span> 메뉴를 삭제하시겠습니까?<br />
            이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteMenu}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 