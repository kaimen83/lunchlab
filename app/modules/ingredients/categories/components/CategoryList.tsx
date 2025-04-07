import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MoreHorizontal, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type CategoryType = "ingredient" | "menu";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  created_at: string;
}

interface CategoryListProps {
  categories: Category[];
  type: CategoryType;
}

export function CategoryList({ categories, type }: CategoryListProps) {
  const handleDelete = (id: string) => {
    console.log(`삭제 요청: ${id}`);
    // 여기에 삭제 API 호출 코드가 들어갑니다
  };

  const handleEdit = (category: Category) => {
    console.log(`편집 요청:`, category);
    // 여기에 편집 모달 열기 코드가 들어갑니다
  };

  return (
    <div className="space-y-3">
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          {type === "ingredient" ? "식재료" : "메뉴"} 카테고리가 없습니다
        </p>
      ) : (
        categories.map((category) => (
          <Card key={category.id} className="p-3 flex justify-between items-center">
            <div>
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline" className="ml-2">
                {category.type === "ingredient" ? "식재료" : "메뉴"}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">메뉴 열기</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="mr-2 h-4 w-4" />
                  편집
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 "{category.name}" 카테고리를 삭제하시겠습니까?
                        이 작업은 되돌릴 수 없으며, 이 카테고리에 속한 모든 항목이 영향을 받습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(category.id)}>
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))
      )}
    </div>
  );
} 