"use client";

import {
  CookingPot,
  FilePen,
  MoreVertical,
  Package,
  PackageOpen,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MenuCardProps } from "../types";
import ContainerCard from "./ContainerCard";

/**
 * 메뉴 카드 컴포넌트
 * 각 메뉴의 정보, 용기, 식재료 정보를 표시합니다.
 */
export default function MenuCard({
  menu,
  expandedMenuId,
  expandedContainers,
  containerDetails,
  loadingContainers,
  isOwnerOrAdmin,
  onAccordionToggle,
  onContainerExpand,
  onViewIngredients,
  onEditMenu,
  onDeleteConfirm,
  formatCurrency,
}: MenuCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
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
              onClick={() => onViewIngredients(menu)}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {isOwnerOrAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditMenu(menu)}
                  className="h-8 w-8"
                >
                  <FilePen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteConfirm(menu)}
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
                  onClick={() => onAccordionToggle(expandedMenuId === menu.id ? null : menu.id)}
                >
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                    <span>용기 및 식자재 정보</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 mt-2">
                    {menu.containers.map((container) => (
                      <ContainerCard
                        key={container.id}
                        container={container}
                        expandedContainers={expandedContainers}
                        containerDetails={containerDetails}
                        isLoading={!!loadingContainers[container.id]}
                        onContainerExpand={onContainerExpand}
                        formatCurrency={formatCurrency}
                      />
                    ))}
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
      <CardFooter className="px-4 py-2 text-xs text-muted-foreground border-t bg-slate-50">
        {menu.containers && menu.containers.length > 0 ? (
          <div className="flex items-center gap-1 w-full">
            <Package className="h-3 w-3 mr-1 text-slate-400" />
            <span className="truncate text-gray-500">
              {menu.containers.map(c => c.container.name).join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">등록된 용기 없음</span>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * 모바일 화면에서 사용하는 메뉴 카드 컴포넌트
 */
export function MobileMenuCard({
  menu,
  expandedMenuId,
  expandedContainers,
  containerDetails,
  loadingContainers,
  isOwnerOrAdmin,
  onAccordionToggle,
  onContainerExpand,
  onViewIngredients,
  onEditMenu,
  onDeleteConfirm,
  formatCurrency,
}: MenuCardProps) {
  return (
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
              <DropdownMenuItem onClick={() => onViewIngredients(menu)}>
                <PackageOpen className="h-4 w-4 mr-2" />
                <span>식자재 보기</span>
              </DropdownMenuItem>
              {isOwnerOrAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEditMenu(menu)}>
                    <FilePen className="h-4 w-4 mr-2" />
                    <span>수정</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => onDeleteConfirm(menu)}
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
            onAccordionToggle(value ? menu.id : null)
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
                    <ContainerCard
                      key={container.id}
                      container={container}
                      expandedContainers={expandedContainers}
                      containerDetails={containerDetails}
                      isLoading={!!loadingContainers[container.id]}
                      onContainerExpand={onContainerExpand}
                      formatCurrency={formatCurrency}
                    />
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
      
      <CardFooter className="px-4 py-2 text-xs text-muted-foreground border-t bg-slate-50">
        {menu.containers && menu.containers.length > 0 ? (
          <div className="flex items-center gap-1 w-full">
            <Package className="h-3 w-3 mr-1 text-slate-400" />
            <span className="truncate text-gray-500">
              {menu.containers.map(c => c.container.name).join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">등록된 용기 없음</span>
        )}
      </CardFooter>
    </Card>
  );
} 