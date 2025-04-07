import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";

interface MenuIngredient {
  ingredient_id: string;
  quantity: number;
  unit?: string;
}

export interface Menu {
  id: string;
  name: string;
  category_id: string;
  category: string;
  ingredients?: MenuIngredient[];
  cooking_time?: number;
  difficulty?: string;
  image_url?: string;
  created_at: string;
}

export const columns: ColumnDef<Menu>[] = [
  {
    accessorKey: "name",
    header: "메뉴명",
    cell: ({ row }) => <div className="font-semibold">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "category",
    header: "카테고리",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("category")}</Badge>
    ),
  },
  {
    accessorKey: "cooking_time",
    header: "조리 시간",
    cell: ({ row }) => {
      const cookingTime = row.getValue("cooking_time");
      return (
        <div>{cookingTime ? `${cookingTime}분` : "-"}</div>
      );
    },
  },
  {
    accessorKey: "difficulty",
    header: "난이도",
    cell: ({ row }) => {
      const difficulty = row.getValue("difficulty") as string;
      
      const colorMap: Record<string, string> = {
        "쉬움": "bg-green-100 text-green-800",
        "보통": "bg-orange-100 text-orange-800", 
        "어려움": "bg-red-100 text-red-800",
      };
      
      return difficulty ? (
        <Badge className={colorMap[difficulty] || ""}>{difficulty}</Badge>
      ) : (
        <span>-</span>
      );
    },
  },
  {
    accessorKey: "ingredients",
    header: "재료 수",
    cell: ({ row }) => {
      const ingredients = row.getValue("ingredients") as MenuIngredient[] | undefined;
      return (
        <div>{ingredients?.length || 0}개</div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const menu = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">메뉴 열기</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>작업</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(menu.id)}>
              ID 복사
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              상세보기
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]; 