'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, FilePen, Trash2, Search, FileText, 
  ChevronDown, ChevronUp, LineChart, CookingPot, PackageOpen, MoreVertical, Package, Eye, Info, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import MenuForm from './MenuForm';
import MenuIngredientsView from './MenuIngredientsView';
import MenuPriceHistory from './MenuPriceHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import ContainersList from './components/ContainersList';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Container {
  id: string;
  container: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
  };
  ingredients: {
    id: string;
    ingredient_id: string;
    amount: number;
    ingredient: {
      id: string;
      name: string;
      package_amount: number;
      unit: string;
      price: number;
    };
  }[];
  ingredients_cost: number;
  total_cost: number;
}

interface Menu {
  id: string;
  name: string;
  cost_price: number;
  description?: string;
  recipe?: string;
  created_at: string;
  updated_at?: string;
  containers?: Container[];
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
  const [containerDialogOpen, setContainerDialogOpen] = useState(false);
  const [tabsView, setTabsView] = useState<'basic' | 'detailed'>('basic');
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

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

  // 식재료 보기 모달
  const handleViewIngredients = (menu: Menu) => {
    setSelectedMenu(menu);
    setIngredientsModalOpen(true);
  };

  // 가격 이력 모달
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

  // 식자재 요약 정보 표시 (가장 비싼 상위 3개)
  const getTopIngredients = (containers: Container[] | undefined) => {
    if (!containers || containers.length === 0) return [];
    
    // 모든 용기의 식자재를 하나의 배열로 평탄화
    const allIngredients = containers.flatMap(container => container.ingredients);
    
    // 식자재별 총 비용 계산
    const ingredientCosts: {name: string, cost: number}[] = [];
    allIngredients.forEach(item => {
      const unitPrice = item.ingredient.price / item.ingredient.package_amount;
      const itemCost = unitPrice * item.amount;
      
      const existingIdx = ingredientCosts.findIndex(i => i.name === item.ingredient.name);
      if (existingIdx >= 0) {
        ingredientCosts[existingIdx].cost += itemCost;
      } else {
        ingredientCosts.push({
          name: item.ingredient.name,
          cost: itemCost
        });
      }
    });
    
    // 비용이 높은 순으로 정렬하고 상위 3개 반환
    return ingredientCosts
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 3);
  };

  // 모바일 카드 아이템 렌더링 (개선된 버전)
  const renderMobileCard = (menu: Menu) => (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{menu.name}</CardTitle>
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
                  <DropdownMenuSeparator />
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
        {menu.description && (
          <p className="text-sm text-gray-600">{menu.description}</p>
        )}
      </CardHeader>

      <CardContent className="pb-2 pt-0">
        <div className="flex items-center justify-between mb-2 bg-slate-100 p-2 rounded">
          <span className="text-sm font-medium">총 식자재 비용:</span>
          <span className="text-lg font-bold">
            {formatCurrency(menu.containers?.reduce((sum, container) => sum + container.ingredients_cost, 0) || 0)}
          </span>
        </div>

        <Accordion
          type="single"
          collapsible
          value={expandedMenuId === menu.id ? 'item-1' : undefined}
          onValueChange={(value: string | undefined) => setExpandedMenuId(value ? menu.id : null)}
        >
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-2">
              <div className="flex items-center text-sm">
                용기 및 식자재 정보
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {menu.containers && menu.containers.length > 0 ? (
                <div className="space-y-3">
                  {menu.containers.map((container) => (
                    <div key={container.id} className="border rounded-md overflow-hidden">
                      <div className="flex justify-between items-center bg-blue-50 p-2 border-b">
                        <span className="font-medium">{container.container.name}</span>
                        <Badge variant="secondary">{formatCurrency(container.ingredients_cost)}</Badge>
                      </div>
                      
                      <div className="p-2 bg-gray-50">
                        <div className="text-xs">
                          <span className="font-semibold">식자재 비용:</span> {formatCurrency(container.ingredients_cost)}
                        </div>
                      </div>
                      
                      {container.ingredients.length > 0 && (
                        <div className="p-2 text-xs">
                          <div className="font-semibold mb-1">주요 식자재:</div>
                          <ul className="space-y-1">
                            {container.ingredients
                              .sort((a, b) => {
                                const aCost = (a.ingredient.price / a.ingredient.package_amount) * a.amount;
                                const bCost = (b.ingredient.price / b.ingredient.package_amount) * b.amount;
                                return bCost - aCost;
                              })
                              .slice(0, 3)
                              .map(item => (
                                <li key={item.id}>
                                  <span>{item.ingredient.name} ({item.amount}{item.ingredient.unit})</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">등록된 용기가 없습니다</div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
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
        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button onClick={handleAddMenu} className="flex-1 sm:flex-auto">
            <Plus className="mr-2 h-4 w-4" /> 메뉴 추가
          </Button>
          {isOwnerOrAdmin && (
            <Button 
              variant="outline" 
              onClick={() => setContainerDialogOpen(true)} 
              className="flex-1 sm:flex-auto"
            >
              <Package className="mr-2 h-4 w-4" /> 용기 설정
            </Button>
          )}
        </div>
      </div>

      {/* 테이블 뷰 전환 */}
      <div className="hidden sm:flex justify-end mb-2">
        <Tabs value={tabsView} onValueChange={(value: string) => setTabsView(value as 'basic' | 'detailed')}>
          <TabsList>
            <TabsTrigger value="basic">기본 보기</TabsTrigger>
            <TabsTrigger value="detailed">상세 보기</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 모바일 뷰 - 카드 형태로 표시 */}
      <div className="block sm:hidden">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">로딩 중...</div>
        ) : filteredMenus.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 메뉴가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMenus.map(menu => renderMobileCard(menu))}
          </div>
        )}
      </div>

      {/* 데스크톱 뷰 - 테이블 형태로 표시 */}
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-0">
            {/* 기본 보기 모드 */}
            {tabsView === 'basic' && (
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
                    <TableHead>용기 옵션</TableHead>
                    <TableHead>주요 식자재</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">로딩 중...</TableCell>
                    </TableRow>
                  ) : filteredMenus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 메뉴가 없습니다.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMenus.map(menu => (
                      <TableRow key={menu.id}>
                        <TableCell className="font-medium">
                          <div>{menu.name}</div>
                          {menu.description && <div className="text-xs text-gray-500">{menu.description}</div>}
                        </TableCell>
                        <TableCell>
                          {menu.containers && menu.containers.length > 0 ? (
                            <div className="space-y-1">
                              {menu.containers.map(container => (
                                <TooltipProvider key={container.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-between border rounded p-1 hover:bg-gray-50">
                                        <span className="text-sm">{container.container.name}</span>
                                        <Badge variant="outline">{formatCurrency(container.ingredients_cost)}</Badge>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <div className="text-xs space-y-1">
                                        <div>식자재 비용: {formatCurrency(container.ingredients_cost)}</div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">등록된 용기가 없습니다</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {menu.containers && menu.containers.length > 0 ? (
                            <div className="text-sm">
                              {getTopIngredients(menu.containers).map((ingredient, idx) => (
                                <div key={idx} className="mb-1">
                                  <span>{ingredient.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
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
            )}

            {/* 상세 보기 모드 */}
            {tabsView === 'detailed' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>메뉴</TableHead>
                    <TableHead>용기</TableHead>
                    <TableHead>식자재 비용</TableHead>
                    <TableHead>주요 식자재</TableHead>
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
                    filteredMenus.flatMap(menu => {
                      // 용기가 없는 경우 단일 행 표시
                      if (!menu.containers || menu.containers.length === 0) {
                        return (
                          <TableRow key={menu.id}>
                            <TableCell className="font-medium">
                              <div>{menu.name}</div>
                              {menu.description && <div className="text-xs text-gray-500">{menu.description}</div>}
                            </TableCell>
                            <TableCell colSpan={2} className="text-center text-gray-500">
                              등록된 용기가 없습니다
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" onClick={() => handleViewIngredients(menu)}>
                                  <PackageOpen className="h-4 w-4" />
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
                        );
                      }
                      
                      // 용기가 있는 경우 용기별로 행 생성
                      return menu.containers!.map((container, idx) => (
                        <TableRow key={`${menu.id}_${container.id}`} className={idx === 0 ? "" : "opacity-80"}>
                          {idx === 0 ? (
                            <TableCell className="font-medium" rowSpan={menu.containers!.length}>
                              <div>{menu.name}</div>
                              {menu.description && <div className="text-xs text-gray-500">{menu.description}</div>}
                            </TableCell>
                          ) : null}
                          <TableCell className="font-medium text-sm">{container.container.name}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(container.ingredients_cost)}</TableCell>
                          <TableCell>
                            <ScrollArea className="h-20">
                              <div className="space-y-1 pr-3">
                                {container.ingredients
                                  .sort((a, b) => {
                                    const aCost = (a.ingredient.price / a.ingredient.package_amount) * a.amount;
                                    const bCost = (b.ingredient.price / b.ingredient.package_amount) * b.amount;
                                    return bCost - aCost;
                                  })
                                  .map(item => (
                                    <div key={item.id} className="text-xs">
                                      <span>{item.ingredient.name} ({item.amount}{item.ingredient.unit})</span>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </TableCell>
                          {idx === 0 ? (
                            <TableCell rowSpan={menu.containers!.length}>
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
                          ) : null}
                        </TableRow>
                      ));
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 용기 설정 모달 */}
      <Dialog open={containerDialogOpen} onOpenChange={setContainerDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>용기 관리</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ContainersList companyId={companyId} />
          </div>
        </DialogContent>
      </Dialog>

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
      {ingredientsModalOpen && selectedMenu && (
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
      )}

      {/* 가격 이력 모달 */}
      {historyModalOpen && selectedMenu && (
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
      )}

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