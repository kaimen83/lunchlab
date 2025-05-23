import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, X } from "lucide-react";

export interface StockFilterValues {
  query?: string;
  itemType?: string;
  stockGrade?: string;
}

interface StockFilterProps {
  onFilterChange: (filters: StockFilterValues) => void;
  defaultValues?: StockFilterValues;
}

export function StockFilter({
  onFilterChange,
  defaultValues = { itemType: "ingredient" },
}: StockFilterProps) {
  const [filters, setFilters] = useState<StockFilterValues>(defaultValues);
  const isFirstRender = useRef(true);

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

  const handleChange = (name: string, value: string) => {
    // 'all' 값을 빈 문자열로 변환하여 API 요청에 사용
    const apiValue = value === 'all' ? '' : value;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    
    // 필터 변경 시 부모에게 알림 (API 요청용 값으로 변환)
    const apiFilters = { ...newFilters };
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
      stockGrade: "all",
    };
    setFilters(resetFilters);
    
    // API 요청용 값으로 변환
    const apiFilters = { ...resetFilters };
    apiFilters.stockGrade = '';
    
    onFilterChange(apiFilters);
  };

  return (
    <Card className="p-4 mb-4">
      <form onSubmit={handleSearch}>
        <div className="flex gap-2 items-center">
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
          
          {/* 식자재 선택 시에만 재고 등급 필터 표시 */}
          {filters.itemType === 'ingredient' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="stockGrade" className="text-sm whitespace-nowrap">재고 등급:</Label>
              <Select
                value={filters.stockGrade || "all"}
                onValueChange={(value) => handleChange("stockGrade", value)}
              >
                <SelectTrigger id="stockGrade" className="w-[120px]">
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
          
          <Button type="submit" size="sm">
            검색
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            초기화
          </Button>
        </div>
      </form>
    </Card>
  );
} 