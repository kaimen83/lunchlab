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
  selectedWarehouseId?: string;
  onWarehouseChange: (warehouseId: string | undefined) => void;
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
        
        // 기본 창고가 있고 선택된 창고가 없으면 "전체 창고" 선택
        if (selectedWarehouseId === undefined && showAllOption) {
          // "전체 창고"가 기본 선택이므로 별도 처리 불필요
          return;
        }
        
        // 기본 창고가 있고 선택된 창고가 없으면 기본 창고 선택 (전체 창고 옵션이 없는 경우)
        if (!selectedWarehouseId && !showAllOption && data.warehouses) {
          const defaultWarehouse = data.warehouses.find((w: Warehouse) => w.is_default);
          if (defaultWarehouse) {
            onWarehouseChange(defaultWarehouse.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchWarehouses();
    }
  }, [companyId, selectedWarehouseId, onWarehouseChange, showAllOption]);

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onWarehouseChange(undefined);
    } else {
      onWarehouseChange(value);
    }
  };

  // 현재 선택된 값 계산
  const currentValue = selectedWarehouseId || 'all';

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