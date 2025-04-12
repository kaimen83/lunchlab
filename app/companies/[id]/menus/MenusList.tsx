"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FilePen,
  Trash2,
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  LineChart,
  CookingPot,
  PackageOpen,
  MoreVertical,
  Package,
  Eye,
  Info,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import MenuForm from "./MenuForm";
import MenuIngredientsView from "./MenuIngredientsView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

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
  code?: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Menu>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientsModalOpen, setIngredientsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [tabsView, setTabsView] = useState<"basic" | "detailed">("basic");
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedContainers, setExpandedContainers] = useState<string[]>([]);

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // 메뉴 목록 로드
  const loadMenus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/menus`);

      if (!response.ok) {
        throw new Error("메뉴 목록을 불러오는데 실패했습니다.");
      }

      const data = await response.json();
      setMenus(data);
    } catch (error) {
      console.error("메뉴 로드 오류:", error);
      toast({
        title: "오류 발생",
        description:
          error instanceof Error
            ? error.message
            : "메뉴 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 정렬 및 필터링된 메뉴 목록
  const filteredMenus = menus
    .filter(
      (menu) =>
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (menu.description &&
          menu.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (menu.code && 
          menu.code.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

  // 메뉴 추가 모달 열기
  const handleAddMenu = () => {
    setModalMode("create");
    setSelectedMenu(null);
    setModalOpen(true);
  };

  // 메뉴 수정 모달 열기
  const handleEditMenu = (menu: Menu) => {
    setModalMode("edit");
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
      const response = await fetch(
        `/api/companies/${companyId}/menus/${menuToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();

        // 식단 계획에서 사용 중인 경우 특별 처리
        if (response.status === 409) {
          throw new Error(
            data.error || "해당 메뉴가 식단 계획에서 사용 중입니다.",
          );
        }

        throw new Error(data.error || "메뉴 삭제에 실패했습니다.");
      }

      // 목록에서 해당 메뉴 제거
      setMenus((prev) => prev.filter((i) => i.id !== menuToDelete.id));

      toast({
        title: "삭제 완료",
        description: `${menuToDelete.name} 메뉴가 삭제되었습니다.`,
        variant: "default",
      });

      setDeleteConfirmOpen(false);
      setMenuToDelete(null);
    } catch (error) {
      console.error("메뉴 삭제 오류:", error);
      toast({
        title: "오류 발생",
        description:
          error instanceof Error
            ? error.message
            : "메뉴 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setDeleteConfirmOpen(false);
    }
  };

  // 식재료 보기 모달
  const handleViewIngredients = (menu: Menu) => {
    setSelectedMenu(menu);
    setIngredientsModalOpen(true);
  };

  // 메뉴 저장 후 처리
  const handleSaveMenu = (savedMenu: Menu) => {
    if (modalMode === "create") {
      setMenus((prev) => [...prev, savedMenu]);
    } else {
      setMenus((prev) =>
        prev.map((i) => (i.id === savedMenu.id ? savedMenu : i)),
      );
    }

    setModalOpen(false);
    setSelectedMenu(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount);
  };

  // 식자재 요약 정보 표시 (가장 비싼 상위 3개)
  const getTopIngredients = (containers: Container[] | undefined) => {
    if (!containers || containers.length === 0) return [];

    // 모든 용기의 식자재를 하나의 배열로 평탄화
    const allIngredients = containers.flatMap(
      (container) => container.ingredients,
    );

    // 식자재별 총 비용 계산
    const ingredientCosts: { name: string; cost: number }[] = [];
    allIngredients.forEach((item) => {
      const unitPrice = item.ingredient.price / item.ingredient.package_amount;
      const itemCost = unitPrice * item.amount;

      const existingIdx = ingredientCosts.findIndex(
        (i) => i.name === item.ingredient.name,
      );
      if (existingIdx >= 0) {
        ingredientCosts[existingIdx].cost += itemCost;
      } else {
        ingredientCosts.push({
          name: item.ingredient.name,
          cost: itemCost,
        });
      }
    });

    // 비용이 높은 순으로 정렬하고 상위 3개 반환
    return ingredientCosts.sort((a, b) => b.cost - a.cost).slice(0, 3);
  };

  // 컨테이너 식자재 더보기 토글
  const toggleContainerExpand = (containerId: string) => {
    setExpandedContainers(prev => 
      prev.includes(containerId) 
        ? prev.filter(id => id !== containerId)
        : [...prev, containerId]
    );
  };

  // 모바일 카드 아이템 렌더링 (개선된 버전)
  const renderMobileCard = (menu: Menu) => (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            <div className="flex items-center">
              <CookingPot className="h-4 w-4 mr-2 text-primary" />
              {menu.name}
            </div>
            {menu.description && (
              <div className="text-xs font-normal text-gray-500 mt-1">
                {menu.description}
              </div>
            )}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewIngredients(menu)}>
                <PackageOpen className="h-4 w-4 mr-2" />
                <span>식자재 보기</span>
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
      </CardHeader>

      <CardContent className="pb-2 pt-0">
        <Accordion
          type="single"
          collapsible
          value={expandedMenuId === menu.id ? "item-1" : undefined}
          onValueChange={(value: string | undefined) =>
            setExpandedMenuId(value ? menu.id : null)
          }
        >
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-2">
              <div className="flex items-center text-sm">
                <Package className="h-4 w-4 mr-2 text-slate-500" />
                용기 및 식자재 정보
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {menu.containers && menu.containers.length > 0 ? (
                <div className="space-y-3">
                  {menu.containers.map((container) => (
                    <div
                      key={container.id}
                      className="rounded-md overflow-hidden shadow-sm border"
                    >
                      <div className="flex items-center justify-between bg-blue-50 p-2 border-b">
                        <div className="flex items-center">
                          <div className="mr-2 bg-white p-1 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                            <Package className="h-3 w-3 text-blue-500" />
                          </div>
                          <span className="font-medium text-sm">
                            {container.container.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-white">
                          {formatCurrency(container.ingredients_cost)}
                        </Badge>
                      </div>

                      {container.ingredients.length > 0 && (
                        <div className="p-2 text-xs bg-white">
                          <div className="text-gray-500 mb-2 text-[10px] flex justify-between px-1">
                            <span>식자재</span>
                            <div className="flex space-x-3">
                              <span>사용량</span>
                              <span>원가</span>
                            </div>
                          </div>
                          <div className="space-y-2 ml-1">
                            {container.ingredients
                              .sort((a, b) => {
                                const aCost =
                                  (a.ingredient.price /
                                    a.ingredient.package_amount) *
                                  a.amount;
                                const bCost =
                                  (b.ingredient.price /
                                    b.ingredient.package_amount) *
                                  b.amount;
                                return bCost - aCost;
                              })
                              .slice(0, expandedContainers.includes(container.id) ? container.ingredients.length : 3)
                              .map((item) => {
                                const unitPrice = item.ingredient.price / item.ingredient.package_amount;
                                const itemCost = unitPrice * item.amount;
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between border-b border-gray-100 pb-1"
                                  >
                                    <div className="flex items-center">
                                      <div className="h-1 w-1 rounded-full bg-slate-300 mr-2"></div>
                                      <span>{item.ingredient.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-gray-600 tabular-nums">
                                        {item.amount} {item.ingredient.unit}
                                      </span>
                                      <span className="text-blue-600 tabular-nums w-14 text-right">
                                        {formatCurrency(itemCost)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            {container.ingredients.length > 3 && !expandedContainers.includes(container.id) && (
                              <div 
                                className="text-xs text-blue-500 mt-2 text-center cursor-pointer flex justify-center items-center space-x-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContainerExpand(container.id);
                                }}
                              >
                                <span>+{container.ingredients.length - 3}개 더보기</span>
                                <ChevronDown className="h-3 w-3" />
                              </div>
                            )}
                            {expandedContainers.includes(container.id) && (
                              <div 
                                className="text-xs text-blue-500 mt-2 text-center cursor-pointer flex justify-center items-center space-x-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContainerExpand(container.id);
                                }}
                              >
                                <span>접기</span>
                                <ChevronUp className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  등록된 용기가 없습니다
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );

  // 테이블 뷰 렌더링
  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[240px] cursor-pointer"
              onClick={() => toggleSort("name")}
            >
              메뉴명
              {sortField === "name" &&
                (sortDirection === "asc" ? (
                  <ChevronUp className="ml-1 inline h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead className="w-[120px]">코드</TableHead>
            <TableHead
              className="w-[120px] cursor-pointer text-right"
              onClick={() => toggleSort("cost_price")}
            >
              원가
              {sortField === "cost_price" &&
                (sortDirection === "asc" ? (
                  <ChevronUp className="ml-1 inline h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMenus.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다." : "등록된 메뉴가 없습니다."}
              </TableCell>
            </TableRow>
          ) : (
            filteredMenus.map((menu) => (
              <TableRow key={menu.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{menu.name}</span>
                    {menu.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {menu.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {menu.code ? (
                    <Badge variant="outline">{menu.code}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(menu.cost_price)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewIngredients(menu)}>
                        <PackageOpen className="h-4 w-4 mr-2" />
                        <span>식자재 보기</span>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="메뉴 이름 검색..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isOwnerOrAdmin && (
          <Button onClick={handleAddMenu} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            메뉴 추가
          </Button>
        )}
      </div>

      {/* 메뉴 목록 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
      ) : renderTableView()}

      {/* 메뉴 추가/수정 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "create" ? "새 메뉴 추가" : "메뉴 수정"}
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

      {/* 메뉴 재료 보기 모달 */}
      <Dialog open={ingredientsModalOpen} onOpenChange={setIngredientsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>메뉴 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuIngredientsView 
              companyId={companyId} 
              menuId={selectedMenu.id} 
            />
          )}
          <DialogFooter>
            <Button onClick={() => setIngredientsModalOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 메뉴 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>메뉴 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {menuToDelete?.name} 메뉴를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMenu}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
