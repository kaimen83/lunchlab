"use client";

import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContainerCardProps } from "../types";

/**
 * 컨테이너 카드 컴포넌트
 * 용기 정보, 식재료 정보, 원가 정보를 표시합니다.
 */
export default function ContainerCard({
  container,
  expandedContainers,
  containerDetails,
  isLoading,
  onContainerExpand,
  formatCurrency,
}: ContainerCardProps) {
  const detail = containerDetails[container.id];
  
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
                      <Badge variant="outline" className="bg-slate-50">
                        {Math.round(detail.calories)} kcal
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-white">칼로리 합계</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1"/> 
                      {formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end" className="p-3 text-white">
                    <div className="text-xs space-y-2">
                      <div className="flex justify-between gap-2">
                        <span className="text-white opacity-80">식재료:</span> 
                        <span className="text-white">{formatCurrency(detail.ingredients_cost)}</span>
                      </div>
                      <div className="flex justify-between gap-2 font-medium">
                        <span className="text-white opacity-80">용기:</span> 
                        <span className="text-white">{formatCurrency(detail.container_price)}</span>
                      </div>
                      <hr className="my-1 border-white border-opacity-20"/>
                      <div className="flex justify-between gap-2 font-semibold">
                        <span className="text-white">총 원가:</span>
                        <span className="text-white">{formatCurrency(detail.total_cost || (detail.ingredients_cost + detail.container_price))}</span>
                      </div>
                      <p className="text-[10px] text-white opacity-70 mt-1 pt-1 border-t border-dashed border-white border-opacity-20">
                        * 용기 가격이 포함된 총 원가입니다
                      </p>
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
                    onContainerExpand(container.id);
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
} 