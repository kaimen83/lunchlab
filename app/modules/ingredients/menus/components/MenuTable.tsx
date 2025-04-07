import React from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, Clock, ChefHat } from 'lucide-react';

interface MenuIngredient {
  ingredient_id: string;
  quantity: number;
  unit?: string;
}

interface Menu {
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

interface MenuTableProps {
  data: Menu[];
}

export function MenuTable({ data }: MenuTableProps) {
  // 난이도별 배지 색상 
  const difficultyColor: Record<string, string> = {
    '쉬움': 'bg-green-100 text-green-800',
    '보통': 'bg-orange-100 text-orange-800',
    '어려움': 'bg-red-100 text-red-800',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((menu) => (
        <Card key={menu.id} className="overflow-hidden">
          <div 
            className="h-40 bg-center bg-cover" 
            style={{ 
              backgroundImage: `url(${menu.image_url || 'https://via.placeholder.com/300x150?text=No+Image'})` 
            }}
          />
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">{menu.name}</h3>
                <p className="text-sm text-muted-foreground">{menu.category}</p>
              </div>
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
                    <Pencil className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2 mt-3">
              {menu.cooking_time && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {menu.cooking_time}분
                </div>
              )}
              {menu.difficulty && (
                <Badge className={`${difficultyColor[menu.difficulty] || ''}`}>
                  <ChefHat className="h-3 w-3 mr-1" />
                  {menu.difficulty}
                </Badge>
              )}
            </div>
            
            <div className="mt-3">
              <p className="text-xs text-muted-foreground font-medium">재료:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {menu.ingredients?.length ? (
                  menu.ingredients.map((ingredient, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {ingredient.ingredient_id === '1' && '소고기'}
                      {ingredient.ingredient_id === '2' && '돼지고기'}
                      {ingredient.ingredient_id === '3' && '양파'}
                      {ingredient.ingredient_id === '4' && '당근'}
                      {ingredient.ingredient_id === '5' && '우유'}
                      {ingredient.ingredient_id === '6' && '달걀'}
                      {' '}
                      {ingredient.quantity}
                      {ingredient.unit}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">등록된 재료 없음</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 