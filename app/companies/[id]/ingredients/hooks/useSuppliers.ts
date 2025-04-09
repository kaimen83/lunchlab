import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Supplier, SupplierOption } from '../schema';

export const useSuppliers = (companyId: string) => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // 식재료 업체 목록 로드 함수를 useCallback으로 감싸 메모이제이션
  const loadSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients/suppliers`);
      
      if (!response.ok) {
        throw new Error('공급업체 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log("공급업체 목록 로드 성공:", data);
      
      const suppliersList = data.map((supplier: Supplier) => ({
        label: supplier.name,
        value: supplier.id
      }));
      setSuppliers(suppliersList);
    } catch (error) {
      console.error('공급업체 로드 오류:', error);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [companyId]);

  // 컴포넌트 마운트 시 한 번만 로드
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // 새 공급업체 추가 함수
  const addNewSupplier = async (supplierName: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/ingredients/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: supplierName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '공급업체 추가에 실패했습니다.');
      }

      const newSupplier = await response.json();
      const newSupplierItem = {
        label: newSupplier.name,
        value: newSupplier.id
      };
      
      setSuppliers(prev => [...prev, newSupplierItem]);

      toast({
        title: '공급업체 추가 완료',
        description: `${newSupplier.name} 공급업체가 추가되었습니다.`,
        variant: 'default',
      });

      return newSupplier.id;
    } catch (error) {
      console.error('공급업체 추가 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '공급업체 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // suppliers 상태를 특정 supplier_id가 있는지 확인하는 유틸리티 함수 추가
  const getSupplierById = useCallback((id: string | undefined | null) => {
    if (!id) return null;
    return suppliers.find(supplier => supplier.value === id) || null;
  }, [suppliers]);

  return {
    suppliers,
    isLoadingSuppliers,
    addNewSupplier,
    loadSuppliers,
    getSupplierById
  };
}; 