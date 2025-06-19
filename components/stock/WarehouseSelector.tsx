'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  selectedWarehouseId?: string | null | undefined;
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
  const [hasSetDefault, setHasSetDefault] = useState(false); // 기본값 설정 여부 추적

  // 창고 목록 조회는 companyId가 변경될 때만 실행
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        setHasSetDefault(false); // 새로운 데이터 로드 시 기본값 설정 상태 초기화
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
  }, [companyId]);

  // 기본 창고 설정 - 한 번만 실행되도록 개선
  useEffect(() => {
    // 로딩 완료, 창고 목록 존재, 기본값 미설정, 선택된 창고 없음, "전체" 옵션 없음인 경우에만 실행
    if (!loading && warehouses.length > 0 && !hasSetDefault && !selectedWarehouseId && !showAllOption) {
      const defaultWarehouse = warehouses.find((w: Warehouse) => w.is_default);
      if (defaultWarehouse) {
        setHasSetDefault(true); // 기본값 설정 완료 표시
        onWarehouseChange(defaultWarehouse.id);
      }
    }
  }, [loading, warehouses.length, hasSetDefault, selectedWarehouseId, showAllOption, onWarehouseChange]);

  // 현재 선택된 값 계산 - useMemo로 최적화하여 불필요한 재계산 방지
  const currentValue = useMemo(() => {
    // selectedWarehouseId가 있으면 그 값을 사용
    if (selectedWarehouseId && selectedWarehouseId !== null && selectedWarehouseId !== '') {
      return selectedWarehouseId;
    }
    
    // selectedWarehouseId가 없고 showAllOption이 true면 'all' 반환
    if (showAllOption) {
      return 'all';
    }
    
    // 그 외의 경우 undefined 반환
    return undefined;
  }, [selectedWarehouseId, showAllOption]);

  const handleValueChange = useCallback((value: string) => {
    if (value === 'all') {
      onWarehouseChange(null);
    } else {
      onWarehouseChange(value);
    }
  }, [onWarehouseChange]);

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