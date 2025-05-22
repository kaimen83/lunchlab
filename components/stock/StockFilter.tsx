import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StockFilterProps {
  onFilterChange: (filters: StockFilterValues) => void;
  defaultValues?: StockFilterValues;
}

export interface StockFilterValues {
  query?: string;
  itemType?: string;
  category?: string;
  stockGrade?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function StockFilter({
  onFilterChange,
  defaultValues = {},
}: StockFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<StockFilterValues>(defaultValues);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // 선택된 항목 유형에 따라 카테고리 옵션 업데이트
  useEffect(() => {
    // 식자재일 경우의 카테고리
    if (filters.itemType === 'ingredient') {
      setAvailableCategories(['육류', '해산물', '채소', '양념', '가공식품', '기타']);
    } 
    // 용기일 경우의 카테고리
    else if (filters.itemType === 'container') {
      setAvailableCategories(['1회용', '다회용', '포장재', '기타']);
    }
    // 기본 카테고리 (모든 항목 선택 시)
    else {
      setAvailableCategories([]);
    }

    // 항목 유형이 변경되면 카테고리 필터 초기화
    if (filters.category) {
      setFilters(prev => ({ ...prev, category: '' }));
    }
  }, [filters.itemType]);

  const handleChange = (name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = () => {
    const resetFilters: StockFilterValues = {
      query: "",
      itemType: "",
      category: "",
      stockGrade: "",
      sortBy: "name",
      sortOrder: "asc",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <Card className="p-4 mb-4">
      <form onSubmit={handleSearch}>
        <div className="flex gap-2 items-center mb-2">
          <div className="relative grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="재고 항목 검색..."
              className="pl-8"
              value={filters.query || ""}
              onChange={(e) => handleChange("query", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button type="submit" size="sm">
            검색
          </Button>
        </div>

        {/* 상단에 항목 유형 필터 탭 추가 */}
        <div className="mt-4">
          <Tabs 
            value={filters.itemType || ""} 
            onValueChange={(value) => handleChange("itemType", value)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="">전체 항목</TabsTrigger>
              <TabsTrigger value="container">용기</TabsTrigger>
              <TabsTrigger value="ingredient">식자재</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isExpanded && (
          <div className="grid gap-4 mt-4 md:grid-cols-3">
            {/* 항목 유형 필터 (탭으로 대체되어 삭제) */}

            {/* 카테고리 필터 (항목 유형에 따라 동적으로 변경) */}
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select
                value={filters.category || ""}
                onValueChange={(value) => handleChange("category", value)}
                disabled={availableCategories.length === 0}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="모든 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">모든 카테고리</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 식자재 선택 시 재고 등급 필터 표시 */}
            {filters.itemType === 'ingredient' && (
              <div className="space-y-2">
                <Label htmlFor="stockGrade">재고 등급</Label>
                <Select
                  value={filters.stockGrade || ""}
                  onValueChange={(value) => handleChange("stockGrade", value)}
                >
                  <SelectTrigger id="stockGrade">
                    <SelectValue placeholder="모든 등급" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">모든 등급</SelectItem>
                    <SelectItem value="A">A 등급</SelectItem>
                    <SelectItem value="B">B 등급</SelectItem>
                    <SelectItem value="C">C 등급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sortBy">정렬 기준</Label>
              <Select
                value={filters.sortBy || "name"}
                onValueChange={(value) => handleChange("sortBy", value)}
              >
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="current_quantity">수량순</SelectItem>
                  <SelectItem value="last_updated">최근 수정일순</SelectItem>
                  <SelectItem value="created_at">생성일순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 방향</Label>
              <Select
                value={filters.sortOrder || "asc"}
                onValueChange={(value) =>
                  handleChange("sortOrder", value as "asc" | "desc")
                }
              >
                <SelectTrigger id="sortOrder">
                  <SelectValue placeholder="정렬 방향" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">오름차순</SelectItem>
                  <SelectItem value="desc">내림차순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              필터 초기화
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
} 