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
  Loader2,
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
  created_at: string;
  updated_at?: string;
  containers?: Container[];
}

interface MenusListProps {
  companyId: string;
  userRole: string;
}

// 컨테이너 상세 정보 응답 인터페이스 추가
interface ContainerDetailsResponse {
  id: string;
  menu_id: string;
  container_id: string;
  container: {
    id: string;
    name: string;
    description: string | null;
    price: number;
  };
  ingredients_cost: number;
  container_price: number;
  total_cost: number;
  calories: number;
  ingredients: any[];
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
  // 컨테이너 상세 정보 관련 상태 추가
  const [containerDetails, setContainerDetails] = useState<Record<string, ContainerDetailsResponse>>({});
  const [loadingContainers, setLoadingContainers] = useState<Record<string, boolean>>({});

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

      // 초기 로드 시에는 칼로리 계산 제외
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

  // 컨테이너 상세 정보 로드 함수
  const loadContainerDetails = async (containerId: string) => {
    // 이미 상세 정보가 있으면 다시 로드하지 않음
    if (containerDetails[containerId]) {
      return;
    }
    
    // 이미 로딩 중이면 중복 요청 방지
    if (loadingContainers[containerId]) {
      return;
    }
    
    // 로딩 상태 설정
    setLoadingContainers(prev => ({
      ...prev,
      [containerId]: true
    }));
    
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ container_id: containerId })
      });
      
      if (!response.ok) {
        throw new Error('컨테이너 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 상세 정보 저장
      setContainerDetails(prev => ({
        ...prev,
        [containerId]: data
      }));
    } catch (error) {
      console.error('컨테이너 상세 정보 로드 오류:', error);
      toast({
        title: "오류 발생",
        description: "용기 상세 정보를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      // 로딩 상태 해제
      setLoadingContainers(prev => ({
        ...prev,
        [containerId]: false
      }));
    }
  };

  // 아코디언 토글 시 컨테이너 상세 정보 로드
  const handleAccordionToggle = (menuId: string | null) => {
    setExpandedMenuId(menuId);
    
    // 메뉴가 확장된 경우, 해당 메뉴의 모든 컨테이너 상세 정보 로드
    if (menuId) {
      const menu = menus.find(m => m.id === menuId);
      if (menu && menu.containers && menu.containers.length > 0) {
        // 각 컨테이너 별로 상세 정보 로드
        menu.containers.forEach(container => {
          loadContainerDetails(container.id);
        });
      }
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

  // 메뉴 저장 후 처리
  const handleSaveMenu = (savedMenu: Menu) => {
    // 메뉴가 저장된 후 전체 메뉴 목록을 다시 로드하여 최신 정보를 표시
    loadMenus();
    
    setModalOpen(false);
    setSelectedMenu(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 1
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
    <Card className="mb-3 flex flex-col h-full">
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

      <CardContent className="pb-2 pt-0 flex-1">
        <Accordion
          type="single"
          collapsible
          value={expandedMenuId === menu.id ? "item-1" : undefined}
          onValueChange={(value: string | undefined) =>
            setExpandedMenuId(value ? menu.id : null)
          }
        >
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-2" onClick={() => handleAccordionToggle(expandedMenuId === menu.id ? null : menu.id)}>
              <div className="flex items-center text-sm">
                <Package className="h-4 w-4 mr-2 text-slate-500" />
                용기 및 식자재 정보
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {menu.containers && menu.containers.length > 0 ? (
                <div className="space-y-3">
                  {menu.containers.map((container) => {
                    const detail = containerDetails[container.id];
                    const isLoading = loadingContainers[container.id];
                    
                    return (
                      <div
                        key={container.id}
                        className="rounded-md overflow-hidden border border-slate-200 bg-white shadow-sm"
                      >
                        {/* 용기 헤더 */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 border-b border-slate-200">
                          <div className="flex items-center">
                            <div className="mr-2 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                              <Package className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-semibold text-sm text-slate-800">
                              {container.container.name}
                            </span>
                          </div>
                          {/* 원가 및 칼로리 정보 */}
                          <div className="flex items-center gap-2 text-xs">
                            {isLoading ? (
                              <div className="h-5 w-20 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                              </div>
                            ) : detail ? (
                              <div className="flex items-center gap-3">
                                {detail.calories > 0 && (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="bg-white border-amber-300 text-amber-700">
                                          {Math.round(detail.calories)} kcal
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>칼로리 합계</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="secondary" className="bg-white border-green-300 text-green-700 flex items-center">
                                        <DollarSign className="h-3 w-3 mr-1"/> 
                                        {formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end">
                                      <div className="text-xs space-y-1">
                                        <p>식재료: {formatCurrency(detail.ingredients_cost)}</p>
                                        <p>용기: {formatCurrency(detail.container_price)}</p>
                                        <hr className="my-1"/>
                                        <p className="font-medium">총 원가: {formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            ) : (
                              <span className="text-slate-400">정보 없음</span>
                            )}
                          </div>
                        </div>

                        {/* 식재료 목록 */}
                        {container.ingredients.length > 0 && (
                          <div className="p-3 text-xs">
                            <div className="grid grid-cols-3 gap-2 mb-2 font-medium text-slate-500 text-[11px] px-1">
                              <span className="col-span-1">식자재명</span>
                              <span className="col-span-1 text-right">사용량</span>
                              <span className="col-span-1 text-right">원가</span>
                            </div>
                            <div className="space-y-1.5">
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
                                      className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-1.5 last:border-b-0"
                                    >
                                      <span className="col-span-1 truncate text-slate-700">
                                        {item.ingredient.name}
                                      </span>
                                      <span className="col-span-1 text-slate-600 tabular-nums text-right">
                                        {item.amount}{item.ingredient.unit}
                                      </span>
                                      <span className="col-span-1 text-blue-600 tabular-nums text-right">
                                        {formatCurrency(itemCost)}
                                      </span>
                                    </div>
                                  );
                                })}
                              {/* 더보기/접기 버튼 */} 
                              {container.ingredients.length > 3 && (
                                <div className="pt-1">
                                  <Button 
                                    variant="link"
                                    size="sm"
                                    className="text-xs h-6 p-0 text-blue-600 hover:text-blue-800 w-full justify-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleContainerExpand(container.id);
                                    }}
                                  >
                                    {expandedContainers.includes(container.id) ? (
                                      <><ChevronUp className="h-3 w-3 mr-1" />접기</>
                                    ) : (
                                      <><ChevronDown className="h-3 w-3 mr-1" />+{container.ingredients.length - 3}개 더보기</>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
      ) : filteredMenus.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenus.map((menu) => (
            <Card key={menu.id} className="overflow-hidden flex flex-col h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
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
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewIngredients(menu)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isOwnerOrAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMenu(menu)}
                          className="h-8 w-8"
                        >
                          <FilePen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConfirm(menu)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {menu.containers && menu.containers.length > 0 ? (
                  <div className="p-4">
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full"
                    >
                      <AccordionItem value="containers" className="border-b-0">
                        <AccordionTrigger 
                          className="py-1 text-sm"
                          onClick={() => handleAccordionToggle(expandedMenuId === menu.id ? null : menu.id)}
                        >
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-slate-500" />
                            <span>용기 및 식자재 정보</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 mt-2">
                            {menu.containers.map((container) => {
                              const detail = containerDetails[container.id];
                              const isLoading = loadingContainers[container.id];
                              
                              return (
                                <div
                                  key={container.id}
                                  className="rounded-md overflow-hidden border border-slate-200 bg-white shadow-sm"
                                >
                                  {/* 용기 헤더 */}
                                  <div className="flex items-center justify-between bg-slate-50 p-3 border-b border-slate-200">
                                    <div className="flex items-center">
                                      <div className="mr-2 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                                        <Package className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <span className="font-semibold text-sm text-slate-800">
                                        {container.container.name}
                                      </span>
                                    </div>
                                    {/* 원가 및 칼로리 정보 */}
                                    <div className="flex items-center gap-2 text-xs">
                                      {isLoading ? (
                                        <div className="h-5 w-20 flex items-center justify-center">
                                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        </div>
                                      ) : detail ? (
                                        <div className="flex items-center gap-3">
                                          {detail.calories > 0 && (
                                            <TooltipProvider delayDuration={100}>
                                              <Tooltip>
                                                <TooltipTrigger>
                                                  <Badge variant="outline" className="bg-white border-amber-300 text-amber-700">
                                                    {Math.round(detail.calories)} kcal
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>칼로리 합계</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                          <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                <Badge variant="secondary" className="bg-white border-green-300 text-green-700 flex items-center">
                                                  <DollarSign className="h-3 w-3 mr-1"/> 
                                                  {formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent side="bottom" align="end">
                                                <div className="text-xs space-y-1">
                                                  <p>식재료: {formatCurrency(detail.ingredients_cost)}</p>
                                                  <p>용기: {formatCurrency(detail.container_price)}</p>
                                                  <hr className="my-1"/>
                                                  <p className="font-medium">총 원가: {formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}</p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">정보 없음</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* 식재료 목록 */}
                                  {container.ingredients.length > 0 && (
                                    <div className="p-3 text-xs">
                                      <div className="grid grid-cols-3 gap-2 mb-2 font-medium text-slate-500 text-[11px] px-1">
                                        <span className="col-span-1">식자재명</span>
                                        <span className="col-span-1 text-right">사용량</span>
                                        <span className="col-span-1 text-right">원가</span>
                                      </div>
                                      <div className="space-y-1.5">
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
                                                className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-1.5 last:border-b-0"
                                              >
                                                <span className="col-span-1 truncate text-slate-700">
                                                  {item.ingredient.name}
                                                </span>
                                                <span className="col-span-1 text-slate-600 tabular-nums text-right">
                                                  {item.amount}{item.ingredient.unit}
                                                </span>
                                                <span className="col-span-1 text-blue-600 tabular-nums text-right">
                                                  {formatCurrency(itemCost)}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        {/* 더보기/접기 버튼 */} 
                                        {container.ingredients.length > 3 && (
                                          <div className="pt-1">
                                            <Button 
                                              variant="link"
                                              size="sm"
                                              className="text-xs h-6 p-0 text-blue-600 hover:text-blue-800 w-full justify-center"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleContainerExpand(container.id);
                                              }}
                                            >
                                              {expandedContainers.includes(container.id) ? (
                                                <><ChevronUp className="h-3 w-3 mr-1" />접기</>
                                              ) : (
                                                <><ChevronDown className="h-3 w-3 mr-1" />+{container.ingredients.length - 3}개 더보기</>
                                              )}
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-center text-gray-500">
                    등록된 용기가 없습니다
                  </div>
                )}
              </CardContent>
              <CardFooter className="px-4 py-2 text-xs text-muted-foreground border-t bg-slate-50 flex justify-between">
                <span className="text-gray-500">
                  {menu.containers?.length || 0}개 용기 사용
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border rounded-md">
          <CookingPot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">등록된 메뉴가 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            '메뉴 추가' 버튼을 클릭하여 새 메뉴를 등록하세요.
          </p>
          {isOwnerOrAdmin && (
            <Button onClick={handleAddMenu}>
              <Plus className="mr-2 h-4 w-4" />
              메뉴 추가
            </Button>
          )}
        </div>
      )}

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
            <>
              <div className="text-xs text-muted-foreground mb-4 flex justify-between border-b pb-3">
                <span>생성: {new Date(selectedMenu.created_at).toLocaleDateString('ko-KR')}</span>
                {selectedMenu.updated_at && (
                  <span>수정: {new Date(selectedMenu.updated_at).toLocaleDateString('ko-KR')}</span>
                )}
              </div>
              <MenuIngredientsView 
                companyId={companyId} 
                menuId={selectedMenu.id} 
              />
            </>
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
