'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // 필터링된 용기 목록
  const filteredContainers = containers.filter(container =>
    container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (container.description && container.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 상단 검색 및 추가 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="용기 검색..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button onClick={handleAddClick} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          용기 추가
        </Button>
      </div>

      {/* 컨테이너 목록 */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
      ) : filteredContainers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredContainers.map((container) => (
            <Card key={container.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-4 w-4 mr-2 text-primary" />
                      {container.name}
                    </CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(container)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(container)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {container.description && (
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground">{container.description}</p>
                </CardContent>
              )}
              <CardFooter className="pt-2 pb-3 flex justify-between text-xs text-muted-foreground">
                <span>
                  생성: {new Date(container.created_at).toLocaleDateString('ko-KR')}
                </span>
                {container.updated_at && (
                  <span>
                    수정: {new Date(container.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border rounded-md">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium mb-1">등록된 용기가 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            '용기 추가' 버튼을 클릭하여 새 용기를 등록하세요.
          </p>
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            용기 추가
          </Button>
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