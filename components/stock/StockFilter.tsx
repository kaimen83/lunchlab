import { useState } from "react";
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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function StockFilter({
  onFilterChange,
  defaultValues = {},
}: StockFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<StockFilterValues>(defaultValues);

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

        {isExpanded && (
          <div className="grid gap-4 mt-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="itemType">항목 유형</Label>
              <Select
                value={filters.itemType || ""}
                onValueChange={(value) => handleChange("itemType", value)}
              >
                <SelectTrigger id="itemType">
                  <SelectValue placeholder="모든 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">모든 유형</SelectItem>
                  <SelectItem value="ingredient">식자재</SelectItem>
                  <SelectItem value="container">용기</SelectItem>
                </SelectContent>
              </Select>
            </div>

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