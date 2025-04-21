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

// 리팩토링된 코드에서 사용할 타입과 유틸리티 함수, 컴포넌트 임포트
import { Menu as MenuType, MenusListProps, ContainerDetailsResponse } from "./types";
import { formatCurrency } from "./utils";
import { loadMenus, loadContainerDetails, deleteMenu } from "./api";
import MenuCard, { MobileMenuCard } from "./components/MenuCard";

export default function MenusList({ companyId, userRole }: MenusListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [menus, setMenus] = useState<MenuType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof MenuType>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedMenu, setSelectedMenu] = useState<MenuType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingredientsModalOpen, setIngredientsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<MenuType | null>(null);
  const [tabsView, setTabsView] = useState<"basic" | "detailed">("basic");
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedContainers, setExpandedContainers] = useState<string[]>([]);
  // 컨테이너 상세 정보 관련 상태 추가
  const [containerDetails, setContainerDetails] = useState<Record<string, ContainerDetailsResponse>>({});
  const [loadingContainers, setLoadingContainers] = useState<Record<string, boolean>>({});

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // 메뉴 목록 로드
  const fetchMenus = async () => {
    setIsLoading(true);
    try {
      const data = await loadMenus(companyId);
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
  const fetchContainerDetails = async (containerId: string) => {
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
      const detailData = await loadContainerDetails(companyId, containerId);
      
      // 상세 정보 저장
      setContainerDetails(prev => ({
        ...prev,
        [containerId]: detailData
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
          fetchContainerDetails(container.id);
        });
      }
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [companyId]);

  // 정렬 처리
  const toggleSort = (field: keyof MenuType) => {
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
  const handleEditMenu = (menu: MenuType) => {
    setModalMode("edit");
    setSelectedMenu(menu);
    setModalOpen(true);
  };

  // 메뉴 삭제 확인 모달 열기
  const handleDeleteConfirm = (menu: MenuType) => {
    setMenuToDelete(menu);
    setDeleteConfirmOpen(true);
  };

  // 메뉴 삭제 처리
  const handleDeleteMenu = async () => {
    if (!menuToDelete) return;

    try {
      await deleteMenu(companyId, menuToDelete.id);

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
  const handleViewIngredients = (menu: MenuType) => {
    setSelectedMenu(menu);
    setIngredientsModalOpen(true);
  };

  // 메뉴 저장 후 처리
  const handleSaveMenu = (savedMenu: MenuType) => {
    // 메뉴가 저장된 후 전체 메뉴 목록을 다시 로드하여 최신 정보를 표시
    fetchMenus();
    
    setModalOpen(false);
    setSelectedMenu(null);
  };

  // 컨테이너 식자재 더보기 토글
  const toggleContainerExpand = (containerId: string) => {
    setExpandedContainers(prev => 
      prev.includes(containerId) 
        ? prev.filter(id => id !== containerId)
        : [...prev, containerId]
    );
  };

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

        <Button onClick={handleAddMenu} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          메뉴 추가
        </Button>
      </div>

      {/* 메뉴 목록 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
      ) : filteredMenus.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              expandedMenuId={expandedMenuId}
              expandedContainers={expandedContainers}
              containerDetails={containerDetails}
              loadingContainers={loadingContainers}
              isOwnerOrAdmin={isOwnerOrAdmin}
              onAccordionToggle={handleAccordionToggle}
              onContainerExpand={toggleContainerExpand}
              onViewIngredients={handleViewIngredients}
              onEditMenu={handleEditMenu}
              onDeleteConfirm={handleDeleteConfirm}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border rounded-md">
          <CookingPot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">등록된 메뉴가 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            '메뉴 추가' 버튼을 클릭하여 새 메뉴를 등록하세요.
          </p>
          <Button onClick={handleAddMenu}>
            <Plus className="mr-2 h-4 w-4" />
            메뉴 추가
          </Button>
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
