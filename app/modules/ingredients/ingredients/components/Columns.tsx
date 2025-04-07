import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// 식재료 타입 정의
export interface Ingredient {
  id: string;
  name: string;
  category_id: string;
  category: string;
  unit: string;
  price_per_unit?: number;
  calories_per_unit?: number;
  allergens?: string[];
  storage_method?: '냉장' | '냉동' | '실온';
  created_at: string;
}

// 테이블 컬럼 정의
export const columns: ColumnDef<Ingredient>[] = [
  {
    accessorKey: 'name',
    header: '식재료명',
  },
  {
    accessorKey: 'category',
    header: '카테고리',
  },
  {
    accessorKey: 'unit',
    header: '단위',
  },
  {
    accessorKey: 'price_per_unit',
    header: '단가',
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price_per_unit'));
      const formatted = price.toLocaleString('ko-KR');
      return <div className="text-right">{formatted}원</div>;
    },
  },
  {
    accessorKey: 'calories_per_unit',
    header: '칼로리',
    cell: ({ row }) => {
      const calories = parseFloat(row.getValue('calories_per_unit'));
      return <div className="text-right">{calories} kcal</div>;
    },
  },
  {
    accessorKey: 'allergens',
    header: '알레르기',
    cell: ({ row }) => {
      const allergens: string[] = row.getValue('allergens');
      if (!allergens || allergens.length === 0) {
        return <div className="text-gray-400">-</div>;
      }
      return (
        <div className="flex gap-1">
          {allergens.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'storage_method',
    header: '보관방법',
    cell: ({ row }) => {
      const method = row.getValue('storage_method') as string;
      const colorMap: Record<string, string> = {
        '냉장': 'bg-blue-100 text-blue-800',
        '냉동': 'bg-indigo-100 text-indigo-800',
        '실온': 'bg-green-100 text-green-800',
      };
      
      return (
        <Badge className={`${colorMap[method] || ''}`}>
          {method}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const ingredient = row.original;
      
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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ingredient.id)}>
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
      );
    },
  },
]; 