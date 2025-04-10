'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ContainerModal, { Container } from './ContainerModal';

interface ContainersListProps {
  companyId: string;
}

export default function ContainersList({ companyId }: ContainersListProps) {
  const { toast } = useToast();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState<Container | null>(null);

  // 용기 목록 불러오기
  const fetchContainers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setContainers(data);
    } catch (error) {
      console.error('용기 불러오기 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로딩
  useEffect(() => {
    fetchContainers();
  }, [companyId]);

  // 용기 편집 버튼 클릭
  const handleEditClick = (container: Container) => {
    setSelectedContainer(container);
    setModalOpen(true);
  };

  // 용기 삭제 버튼 클릭 
  const handleDeleteClick = (container: Container) => {
    setContainerToDelete(container);
    setDeleteDialogOpen(true);
  };

  // 용기 삭제 처리
  const confirmDelete = async () => {
    if (!containerToDelete) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/containers/${containerToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '용기 삭제 중 오류가 발생했습니다.');
      }
      
      toast({
        title: '용기 삭제 완료',
        description: `${containerToDelete.name} 용기가 삭제되었습니다.`,
      });
      
      // 목록 새로고침
      fetchContainers();
    } catch (error) {
      console.error('용기 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setContainerToDelete(null);
    }
  };

  // 새 용기 추가
  const handleAddClick = () => {
    setSelectedContainer(undefined);
    setModalOpen(true);
  };

  // 카테고리 한글 변환
  const getCategoryLabel = (category?: string) => {
    if (!category) return '-';
    
    const categories: Record<string, string> = {
      'plastic': '플라스틱',
      'paper': '종이',
      'glass': '유리',
      'metal': '금속',
      'eco': '친환경',
      'other': '기타'
    };
    
    return categories[category] || category;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">용기 관리</h3>
        <Button onClick={handleAddClick} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          용기 추가
        </Button>
      </div>

      {loading ? (
        <div className="py-4 text-center text-muted-foreground">로딩 중...</div>
      ) : containers.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>분류</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[100px] text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {containers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell className="font-medium">{container.name}</TableCell>
                  <TableCell>{getCategoryLabel(container.category)}</TableCell>
                  <TableCell className="text-muted-foreground">{container.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(container)}
                        title="수정"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(container)}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="py-4 text-center border rounded-md text-muted-foreground">
          등록된 용기가 없습니다. '용기 추가' 버튼을 클릭하여 새 용기를 추가하세요.
        </div>
      )}

      {/* 용기 추가/수정 모달 */}
      <ContainerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={companyId}
        container={selectedContainer}
        onSuccess={fetchContainers}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>용기 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {containerToDelete?.name} 용기를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 