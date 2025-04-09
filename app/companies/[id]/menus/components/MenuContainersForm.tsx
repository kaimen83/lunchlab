'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash, Plus, PackageOpen } from 'lucide-react';
import ContainerSizeModal from './ContainerSizeModal';

// 용기 사이즈 타입 정의
interface ContainerSize {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// 메뉴-용기 관계 타입 정의
interface MenuContainer {
  id?: string;
  menu_id?: string;
  container_size_id: string;
  container?: ContainerSize;
  ingredient_amount_factor: number;
  cost_price?: number;
}

interface MenuContainersFormProps {
  companyId: string;
  menuId: string;
  baseCostPrice: number;
  onSave?: (containers: MenuContainer[]) => void;
}

export default function MenuContainersForm({
  companyId,
  menuId,
  baseCostPrice,
  onSave,
}: MenuContainersFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [menuContainers, setMenuContainers] = useState<MenuContainer[]>([]);
  const [containerSizeModalOpen, setContainerSizeModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 메뉴-용기 관계 목록 로드
  const loadMenuContainers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/${menuId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setMenuContainers(data);
    } catch (error) {
      console.error('용기 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuContainers();
  }, [companyId, menuId]);

  // 용기 사이즈 선택 처리
  const handleContainerSizeSelect = (containerSize: ContainerSize) => {
    // 이미 선택된 용기 사이즈인지 확인
    const isAlreadySelected = menuContainers.some(
      container => container.container_size_id === containerSize.id
    );
    
    if (isAlreadySelected) {
      toast({
        title: '이미 선택됨',
        description: '이미 선택된 용기 사이즈입니다.',
        variant: 'destructive',
      });
      return;
    }
    
    // 새 용기 사이즈 추가
    const newContainer: MenuContainer = {
      container_size_id: containerSize.id,
      container: containerSize,
      ingredient_amount_factor: 1.0, // 기본값
      cost_price: baseCostPrice, // 기본 원가 (실제로는 저장 시 서버에서 계산)
    };
    
    setMenuContainers(prev => [...prev, newContainer]);
  };

  // 용기 사이즈 삭제
  const handleRemoveContainer = (index: number) => {
    setMenuContainers(prev => prev.filter((_, i) => i !== index));
  };

  // 양 비율 변경
  const handleFactorChange = (index: number, value: string) => {
    const factor = parseFloat(value);
    
    if (isNaN(factor) || factor <= 0) {
      return;
    }
    
    setMenuContainers(prev => 
      prev.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              ingredient_amount_factor: factor,
              cost_price: baseCostPrice * factor, // 원가 계산
            } 
          : item
      )
    );
  };

  // 저장 처리
  const handleSave = async () => {
    if (menuContainers.length === 0) {
      toast({
        title: '용기 사이즈 필요',
        description: '최소 하나 이상의 용기 사이즈를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch(`/api/companies/${companyId}/menus/${menuId}/containers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menuContainers.map(container => ({
          container_size_id: container.container_size_id,
          ingredient_amount_factor: container.ingredient_amount_factor,
        }))),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요청 처리 중 오류가 발생했습니다.');
      }
      
      const savedContainers = await response.json();
      setMenuContainers(savedContainers);
      
      toast({
        title: '저장 완료',
        description: `용기 사이즈 설정이 저장되었습니다.`,
        variant: 'default',
      });
      
      if (onSave) {
        onSave(savedContainers);
      }
    } catch (error) {
      console.error('용기 사이즈 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 사이즈 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 숫자 포맷팅 유틸리티 함수
  const formatPrice = (value: number | undefined): string => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">용기 사이즈별 설정</h3>
        <Button 
          onClick={() => setContainerSizeModalOpen(true)}
          variant="outline"
          className="flex items-center gap-1"
        >
          <PackageOpen className="h-4 w-4" />
          <span>용기 사이즈 추가</span>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : menuContainers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">등록된 용기 사이즈가 없습니다.</p>
            <p className="text-gray-500 mt-2">용기 사이즈를 추가하여 메뉴에 적용하세요.</p>
            <Button 
              onClick={() => setContainerSizeModalOpen(true)}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              용기 사이즈 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>용기 사이즈</TableHead>
                <TableHead>양 비율</TableHead>
                <TableHead>예상 원가</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuContainers.map((container, index) => (
                <TableRow key={container.id || `new-${index}`}>
                  <TableCell>{container.container?.name || '불명'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={container.ingredient_amount_factor}
                        onChange={(e) => handleFactorChange(index, e.target.value)}
                        className="w-24"
                      />
                      <span className="ml-2">배</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatPrice(container.cost_price)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContainer(index)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={isLoading || isSaving || menuContainers.length === 0}
        >
          {isSaving ? '저장 중...' : '저장'}
        </Button>
      </div>
      
      <ContainerSizeModal 
        companyId={companyId}
        isOpen={containerSizeModalOpen}
        onClose={() => setContainerSizeModalOpen(false)}
        onContainerSizeSelect={handleContainerSizeSelect}
      />
    </div>
  );
} 