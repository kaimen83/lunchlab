'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Warehouse {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
}

interface WarehouseSelectorProps {
  companyId: string;
  selectedWarehouseId?: string | null;
  onWarehouseChange: (warehouseId: string | null | undefined) => void;
  placeholder?: string;
  className?: string;
  showAllOption?: boolean;
}

export default function WarehouseSelector({
  companyId,
  selectedWarehouseId,
  onWarehouseChange,
  placeholder = "창고 선택",
  className,
  showAllOption = true
}: WarehouseSelectorProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 창고 목록 조회는 companyId가 변경될 때만 실행
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/companies/${companyId}/warehouses`);
        
        if (!response.ok) {
          throw new Error('창고 목록을 불러올 수 없습니다.');
        }

        const data = await response.json();
        setWarehouses(data.warehouses || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchWarehouses();
    }
  }, [companyId]); // 의존성 배열을 companyId만으로 제한

  // 기본 창고 설정은 별도 useEffect로 분리
  useEffect(() => {
    // 창고 목록이 로드되고, 선택된 창고가 없고, "전체 창고" 옵션이 없는 경우에만 기본 창고 선택
    if (warehouses.length > 0 && !selectedWarehouseId && !showAllOption) {
      const defaultWarehouse = warehouses.find((w: Warehouse) => w.is_default);
      if (defaultWarehouse) {
        onWarehouseChange(defaultWarehouse.id);
      }
    }
  }, [warehouses, selectedWarehouseId, showAllOption]); // onWarehouseChange 의존성 제거로 무한 루프 방지

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onWarehouseChange(null);
    } else {
      onWarehouseChange(value);
    }
  };

  // 현재 선택된 값 계산
  const currentValue = selectedWarehouseId || (showAllOption ? 'all' : undefined);

  if (loading) {
    return (
      <div className={className}>
        <span className="text-sm text-gray-500">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="h-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">전체 창고</SelectItem>
          )}
          {warehouses.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              <div className="flex items-center space-x-2">
                <span>{warehouse.name}</span>
                {warehouse.is_default && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">(기본)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 