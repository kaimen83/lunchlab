import { useState, useEffect, useRef } from "react";
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
  defaultValues = { itemType: "ingredient" },
}: StockFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<StockFilterValues>(defaultValues);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const isFirstRender = useRef(true);
  const prevItemType = useRef(defaultValues.itemType);

  // 컴포넌트가 마운트될 때 한 번만 defaultValues 설정
  useEffect(() => {
    if (isFirstRender.current) {
      setFilters(defaultValues);
      isFirstRender.current = false;
    }
  }, [defaultValues]);

  // defaultValues가 변경되면 필터 업데이트
  useEffect(() => {
    if (!isFirstRender.current) {
      setFilters(prev => ({
        ...prev,
        itemType: defaultValues.itemType
      }));
    }
  }, [defaultValues.itemType]);

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
    // 기본값으로 빈 카테고리 설정
    else {
      setAvailableCategories([]);
    }

    // 항목 유형이 변경되었고, 이전에 카테고리가 설정되어 있었다면 카테고리 초기화
    if (prevItemType.current !== filters.itemType && filters.category && filters.category !== 'all') {
      setFilters(prev => ({ ...prev, category: 'all' }));
    }

    // 현재 항목 유형을 저장
    prevItemType.current = filters.itemType;
  }, [filters.itemType, filters.category]);

  const handleChange = (name: string, value: string) => {
    // 'all' 값을 빈 문자열로 변환하여 API 요청에 사용
    const apiValue = value === 'all' ? '' : value;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // 필터 변경 시 부모에게 알림 (API 요청용 값으로 변환)
    const apiFilters = { ...newFilters };
    if (apiFilters.category === 'all') apiFilters.category = '';
    if (apiFilters.stockGrade === 'all') apiFilters.stockGrade = '';
    
    onFilterChange(apiFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  const handleReset = () => {
    const resetFilters: StockFilterValues = {
      query: "",
      itemType: filters.itemType, // 현재 선택된 항목 유형은 유지
      category: "all",
      stockGrade: "all",
      sortBy: "name",
      sortOrder: "asc",
    };
    setFilters(resetFilters);
    
    // API 요청용 값으로 변환
    const apiFilters = { ...resetFilters };
    apiFilters.category = '';
    apiFilters.stockGrade = '';
    
    onFilterChange(apiFilters);
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

        {isExpanded && (
          <div className="grid gap-4 mt-4 md:grid-cols-2">
            {/* 카테고리 필터 */}
            {availableCategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(value) => handleChange("category", value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="모든 카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 식자재 선택 시 재고 등급 필터 표시 */}
            {filters.itemType === 'ingredient' && (
              <div className="space-y-2">
                <Label htmlFor="stockGrade">재고 등급</Label>
                <Select
                  value={filters.stockGrade || "all"}
                  onValueChange={(value) => handleChange("stockGrade", value)}
                >
                  <SelectTrigger id="stockGrade">
                    <SelectValue placeholder="모든 등급" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 등급</SelectItem>
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