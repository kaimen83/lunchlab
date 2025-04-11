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
import MenuPriceHistory from "./MenuPriceHistory";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Menu>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientsModalOpen, setIngredientsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
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
          menu.description.toLowerCase().includes(searchQuery.toLowerCase())),
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

  // 가격 이력 모달
  const handleViewPriceHistory = (menu: Menu) => {
    setSelectedMenu(menu);
    setHistoryModalOpen(true);
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

  return (
    <div className="space-y-4">
      {/* 검색 및 추가 버튼 */}
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="flex items-center relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="메뉴 검색..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button onClick={handleAddMenu} className="flex-1 sm:flex-auto">
            <Plus className="mr-2 h-4 w-4" /> 메뉴 추가
          </Button>
        </div>
      </div>

      {/* 테이블 뷰 전환 */}
      <div className="hidden sm:flex justify-end mb-2">
        <Tabs
          value={tabsView}
          onValueChange={(value: string) =>
            setTabsView(value as "basic" | "detailed")
          }
        >
          <TabsList>
            <TabsTrigger value="basic">카드 보기</TabsTrigger>
            <TabsTrigger value="detailed">테이블 보기</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 모바일 뷰 - 카드 형태로 표시 */}
      <div className="block sm:hidden">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">로딩 중...</div>
        ) : filteredMenus.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? "검색 결과가 없습니다." : "등록된 메뉴가 없습니다."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMenus.map((menu) => renderMobileCard(menu))}
          </div>
        )}
      </div>

      {/* 데스크톱 뷰 - 카드 또는 테이블 형태로 표시 */}
      <div className="hidden sm:block">
        {tabsView === "basic" ? (
          /* 카드 그리드 형태 (PC용) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 col-span-full">로딩 중...</div>
            ) : filteredMenus.length === 0 ? (
              <div className="p-4 text-center text-gray-500 col-span-full">
                {searchQuery ? "검색 결과가 없습니다." : "등록된 메뉴가 없습니다."}
              </div>
            ) : (
              filteredMenus.map((menu) => (
                <Card key={menu.id} className="overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-gray-50">
                    <div className="flex justify-between items-start">
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
                      <Badge variant="outline" className="bg-white">
                        {formatCurrency(menu.cost_price)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {menu.containers && menu.containers.length > 0 ? (
                      <div className="px-4 py-3">
                        <div className="text-sm font-medium mb-2 flex items-center">
                          <Package className="h-4 w-4 mr-1 text-slate-500" />
                          <span>용기 정보</span>
                        </div>
                        <div className="space-y-2">
                          {menu.containers.map((container) => (
                            <div 
                              key={container.id}
                              className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-md text-sm"
                            >
                              <span>{container.container.name}</span>
                              <Badge variant="secondary" className="bg-white">
                                {formatCurrency(container.ingredients_cost)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-sm font-medium mt-4 mb-2 flex items-center">
                          <CookingPot className="h-4 w-4 mr-1 text-slate-500" />
                          <span>주요 식자재</span>
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {getTopIngredients(menu.containers).map((ingredient, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-2"></div>
                                <span>{ingredient.name}</span>
                              </div>
                              <span className="text-slate-500">
                                {formatCurrency(ingredient.cost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-center text-gray-500">
                        등록된 용기가 없습니다
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="bg-slate-50 p-2 flex justify-end space-x-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewIngredients(menu)}
                      className="h-8"
                    >
                      <PackageOpen className="h-4 w-4 mr-1" />
                      <span className="text-xs">식자재</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPriceHistory(menu)}
                      className="h-8"
                    >
                      <LineChart className="h-4 w-4 mr-1" />
                      <span className="text-xs">가격이력</span>
                    </Button>
                    
                    {isOwnerOrAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMenu(menu)}
                          className="h-8"
                        >
                          <FilePen className="h-4 w-4 mr-1" />
                          <span className="text-xs">수정</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-8"
                          onClick={() => handleDeleteConfirm(menu)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span className="text-xs">삭제</span>
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* 테이블 형태 */
          <Card>
            <CardContent className="p-0">
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
                      <TableCell colSpan={5} className="text-center">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : filteredMenus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {searchQuery
                          ? "검색 결과가 없습니다."
                          : "등록된 메뉴가 없습니다."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMenus.flatMap((menu) => {
                      // 용기가 없는 경우 단일 행 표시
                      if (!menu.containers || menu.containers.length === 0) {
                        return (
                          <TableRow key={menu.id}>
                            <TableCell className="font-medium">
                              <div>{menu.name}</div>
                              {menu.description && (
                                <div className="text-xs text-gray-500">
                                  {menu.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell
                              colSpan={2}
                              className="text-center text-gray-500"
                            >
                              등록된 용기가 없습니다
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewIngredients(menu)}
                                >
                                  <PackageOpen className="h-4 w-4" />
                                </Button>
                                {isOwnerOrAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditMenu(menu)}
                                    >
                                      <FilePen className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteConfirm(menu)}
                                    >
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
                        <TableRow
                          key={`${menu.id}_${container.id}`}
                          className={idx === 0 ? "" : "opacity-80"}
                        >
                          {idx === 0 ? (
                            <TableCell
                              className="font-medium"
                              rowSpan={menu.containers!.length}
                            >
                              <div>{menu.name}</div>
                              {menu.description && (
                                <div className="text-xs text-gray-500">
                                  {menu.description}
                                </div>
                              )}
                            </TableCell>
                          ) : null}
                          <TableCell className="font-medium text-sm">
                            {container.container.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(container.ingredients_cost)}
                          </TableCell>
                          <TableCell>
                            <ScrollArea className="h-20">
                              <div className="space-y-1 pr-3">
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
                                  .map((item) => (
                                    <div key={item.id} className="text-xs">
                                      <span>
                                        {item.ingredient.name} ({item.amount}
                                        {item.ingredient.unit})
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </TableCell>
                          {idx === 0 ? (
                            <TableCell rowSpan={menu.containers!.length}>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewIngredients(menu)}
                                >
                                  <PackageOpen className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewPriceHistory(menu)}
                                >
                                  <LineChart className="h-4 w-4" />
                                </Button>

                                {isOwnerOrAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditMenu(menu)}
                                    >
                                      <FilePen className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteConfirm(menu)}
                                    >
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* 메뉴 추가/수정 모달 */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
            // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
            setTimeout(() => {
              setModalOpen(false);
              if (!ingredientsModalOpen && !historyModalOpen)
                setSelectedMenu(null);

              // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
              document.body.style.pointerEvents = "";
              document.body.style.touchAction = "";

              // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
              try {
                // aria-hidden 속성 제거 - 안전하게 처리
                document
                  .querySelectorAll('[aria-hidden="true"]')
                  .forEach((el) => {
                    try {
                      if (
                        el instanceof HTMLElement &&
                        !el.dataset.permanent &&
                        document.body.contains(el)
                      ) {
                        el.removeAttribute("aria-hidden");
                      }
                    } catch (e) {
                      // 속성 제거 중 오류 시 무시
                    }
                  });
              } catch (e) {
                // 오류 발생 시 조용히 처리
                console.warn("모달 닫기 처리 중 오류:", e);
              }
            }, 100);
          } else {
            setModalOpen(open);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="menu-form-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();

            // 이슈 #1236 해결: 터치 이벤트 차단 문제
            document.body.style.pointerEvents = "";
            document.body.style.touchAction = "";
            document.documentElement.style.touchAction = "";

            // 모든 포커스 제거
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onPointerDownOutside={(e) => {
            // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {modalMode === "create" ? "메뉴 추가" : "메뉴 수정"}
            </DialogTitle>
          </DialogHeader>
          <div id="menu-form-description" className="sr-only">
            {modalMode === "create"
              ? "새 메뉴를 추가합니다"
              : "메뉴 정보를 수정합니다"}
          </div>
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
        <Dialog
          open={ingredientsModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
              // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
              setTimeout(() => {
                setIngredientsModalOpen(false);
                if (!modalOpen && !historyModalOpen) setSelectedMenu(null);

                // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
                document.body.style.pointerEvents = "";
                document.body.style.touchAction = "";

                // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
                try {
                  // aria-hidden 속성 제거 - 안전하게 처리
                  document
                    .querySelectorAll('[aria-hidden="true"]')
                    .forEach((el) => {
                      try {
                        if (
                          el instanceof HTMLElement &&
                          !el.dataset.permanent &&
                          document.body.contains(el)
                        ) {
                          el.removeAttribute("aria-hidden");
                        }
                      } catch (e) {
                        // 속성 제거 중 오류 시 무시
                      }
                    });
                } catch (e) {
                  // 오류 발생 시 조용히 처리
                  console.warn("모달 닫기 처리 중 오류:", e);
                }
              }, 100);
            } else {
              setIngredientsModalOpen(open);
            }
          }}
        >
          <DialogContent
            className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
            aria-describedby="menu-ingredients-description"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.body.focus();

              // 이슈 #1236 해결: 터치 이벤트 차단 문제
              document.body.style.pointerEvents = "";
              document.body.style.touchAction = "";
              document.documentElement.style.touchAction = "";

              // 모든 포커스 제거
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
            onPointerDownOutside={(e) => {
              // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>메뉴 식재료 - {selectedMenu?.name}</DialogTitle>
            </DialogHeader>
            <div id="menu-ingredients-description" className="sr-only">
              {selectedMenu?.name}의 식재료 정보를 확인합니다
            </div>
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
        <Dialog
          open={historyModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
              // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
              setTimeout(() => {
                setHistoryModalOpen(false);
                if (!modalOpen && !ingredientsModalOpen) setSelectedMenu(null);

                // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
                document.body.style.pointerEvents = "";
                document.body.style.touchAction = "";

                // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
                try {
                  // aria-hidden 속성 제거 - 안전하게 처리
                  document
                    .querySelectorAll('[aria-hidden="true"]')
                    .forEach((el) => {
                      try {
                        if (
                          el instanceof HTMLElement &&
                          !el.dataset.permanent &&
                          document.body.contains(el)
                        ) {
                          el.removeAttribute("aria-hidden");
                        }
                      } catch (e) {
                        // 속성 제거 중 오류 시 무시
                      }
                    });
                } catch (e) {
                  // 오류 발생 시 조용히 처리
                  console.warn("모달 닫기 처리 중 오류:", e);
                }
              }, 100);
            } else {
              setHistoryModalOpen(open);
            }
          }}
        >
          <DialogContent
            className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
            aria-describedby="menu-price-history-description"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.body.focus();

              // 이슈 #1236 해결: 터치 이벤트 차단 문제
              document.body.style.pointerEvents = "";
              document.body.style.touchAction = "";
              document.documentElement.style.touchAction = "";

              // 모든 포커스 제거
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
            onPointerDownOutside={(e) => {
              // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>가격 이력 - {selectedMenu?.name}</DialogTitle>
            </DialogHeader>
            <div id="menu-price-history-description" className="sr-only">
              {selectedMenu?.name}의 가격 변동 이력을 확인합니다
            </div>
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
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            // 이슈 #1241 해결: pointer-events 스타일이 남아있는 문제 해결
            // 모달이 닫힐 때 setTimeout을 사용하여 비동기적으로 상태 업데이트
            setTimeout(() => {
              setDeleteConfirmOpen(false);
              setMenuToDelete(null);

              // 핵심 수정: 모달 닫힌 후 남아있는 스타일 속성 제거 및 DOM 정리
              document.body.style.pointerEvents = "";
              document.body.style.touchAction = "";

              // Note: DOM 요소 직접 제거는 안전하게 처리 - React와의 충돌 방지
              try {
                // aria-hidden 속성 제거 - 안전하게 처리
                document
                  .querySelectorAll('[aria-hidden="true"]')
                  .forEach((el) => {
                    try {
                      if (
                        el instanceof HTMLElement &&
                        !el.dataset.permanent &&
                        document.body.contains(el)
                      ) {
                        el.removeAttribute("aria-hidden");
                      }
                    } catch (e) {
                      // 속성 제거 중 오류 시 무시
                    }
                  });
              } catch (e) {
                // 오류 발생 시 조용히 처리
                console.warn("모달 닫기 처리 중 오류:", e);
              }
            }, 100);
          } else {
            setDeleteConfirmOpen(open);
          }
        }}
      >
        <DialogContent
          aria-describedby="menu-delete-dialog-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();

            // 이슈 #1236 해결: 터치 이벤트 차단 문제
            document.body.style.pointerEvents = "";
            document.body.style.touchAction = "";
            document.documentElement.style.touchAction = "";

            // 모든 포커스 제거
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }}
          onPointerDownOutside={(e) => {
            // 이슈 #1236 해결: 모달 외부 클릭 시 포인터 이벤트 정상화
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>메뉴 삭제</DialogTitle>
          </DialogHeader>
          <p className="py-4" id="menu-delete-dialog-description">
            정말로 <span className="font-semibold">{menuToDelete?.name}</span>{" "}
            메뉴를 삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteMenu}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
