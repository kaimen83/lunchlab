'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash, PlusCircle } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

// 용기 사이즈 타입 정의
interface ContainerSize {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// 변환 로직을 분리한 단순화된 zod 스키마
const containerSizeSchema = z.object({
  name: z.string().min(1, { message: '용기 사이즈 이름은 필수입니다.' }),
  description: z.string().max(500, { message: '설명은 500자 이하여야 합니다.' }).optional(),
});

// 스키마에서 자동으로 타입 추론
type ContainerSizeFormValues = z.infer<typeof containerSizeSchema>;

interface ContainerSizeModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onContainerSizeSelect: (containerSize: ContainerSize) => void;
}

export default function ContainerSizeModal({
  companyId,
  isOpen,
  onClose,
  onContainerSizeSelect,
}: ContainerSizeModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [containerSizes, setContainerSizes] = useState<ContainerSize[]>([]);
  const [selectedContainerSize, setSelectedContainerSize] = useState<ContainerSize | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [containerSizeToDelete, setContainerSizeToDelete] = useState<ContainerSize | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 폼 초기화
  const form = useForm<ContainerSizeFormValues>({
    resolver: zodResolver(containerSizeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // 용기 사이즈 목록 로드
  const loadContainerSizes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/container-sizes`);
      
      if (!response.ok) {
        throw new Error('용기 사이즈 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setContainerSizes(data);
    } catch (error) {
      console.error('용기 사이즈 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 사이즈 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContainerSizes();
    }
  }, [companyId, isOpen]);

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (formMode === 'edit' && selectedContainerSize) {
      form.reset({
        name: selectedContainerSize.name,
        description: selectedContainerSize.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [formMode, selectedContainerSize, form]);

  // 용기 사이즈 추가 모달 열기
  const handleAddContainerSize = () => {
    setFormMode('create');
    setSelectedContainerSize(null);
    setFormModalOpen(true);
  };

  // 용기 사이즈 수정 모달 열기
  const handleEditContainerSize = (containerSize: ContainerSize) => {
    setFormMode('edit');
    setSelectedContainerSize(containerSize);
    setFormModalOpen(true);
  };

  // 용기 사이즈 삭제 확인 다이얼로그 열기
  const handleDeleteConfirm = (containerSize: ContainerSize) => {
    setContainerSizeToDelete(containerSize);
    setDeleteDialogOpen(true);
  };

  // 용기 사이즈 삭제 처리
  const handleDeleteContainerSize = async () => {
    if (!containerSizeToDelete) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/container-sizes/${containerSizeToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        
        // 메뉴에서 사용 중인 경우 특별 처리
        if (response.status === 409) {
          throw new Error(data.error || '해당 용기 사이즈가 메뉴에서 사용 중입니다.');
        }
        
        throw new Error(data.error || '용기 사이즈 삭제에 실패했습니다.');
      }
      
      // 목록에서 해당 용기 사이즈 제거
      setContainerSizes(prev => prev.filter(i => i.id !== containerSizeToDelete.id));
      
      toast({
        title: '삭제 완료',
        description: `${containerSizeToDelete.name} 용기 사이즈가 삭제되었습니다.`,
        variant: 'default',
      });
      
      setDeleteDialogOpen(false);
      setContainerSizeToDelete(null);
    } catch (error) {
      console.error('용기 사이즈 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 사이즈 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
    }
  };

  // 용기 사이즈 선택
  const handleSelectContainerSize = (containerSize: ContainerSize) => {
    onContainerSizeSelect(containerSize);
    onClose();
  };

  // 폼 제출 처리
  const onSubmit = async (data: ContainerSizeFormValues) => {
    try {
      let url = `/api/companies/${companyId}/container-sizes`;
      let method = 'POST';
      
      if (formMode === 'edit' && selectedContainerSize) {
        url = `${url}/${selectedContainerSize.id}`;
        method = 'PATCH';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요청 처리 중 오류가 발생했습니다.');
      }
      
      const savedContainerSize = await response.json();
      
      if (formMode === 'create') {
        setContainerSizes(prev => [...prev, savedContainerSize]);
      } else {
        setContainerSizes(prev => 
          prev.map(i => i.id === savedContainerSize.id ? savedContainerSize : i)
        );
      }
      
      toast({
        title: formMode === 'create' ? '용기 사이즈 추가 완료' : '용기 사이즈 수정 완료',
        description: `${savedContainerSize.name} 용기 사이즈가 ${formMode === 'create' ? '추가' : '수정'}되었습니다.`,
        variant: 'default',
      });
      
      setFormModalOpen(false);
    } catch (error) {
      console.error('용기 사이즈 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 사이즈 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 필터링된 용기 사이즈 목록
  const filteredContainerSizes = containerSizes.filter(size => 
    size.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (size.description && size.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // 사용자가 새 용기 사이즈를 입력할 수 있도록 항목 표시
  const isExactMatch = containerSizes.some(size => 
    size.name.toLowerCase() === searchQuery.toLowerCase()
  );
  
  const handleCreateNewSize = () => {
    if (searchQuery.trim() !== '') {
      setFormMode('create');
      form.reset({
        name: searchQuery,
        description: '',
      });
      setFormModalOpen(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>용기 사이즈 선택</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 my-4">
            {/* 검색 및 추가 버튼 */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox
                  items={
                    filteredContainerSizes.map(size => ({
                      value: size.id,
                      label: size.name,
                    }))
                  }
                  placeholder="용기 사이즈 검색 또는 직접 입력"
                  value={searchQuery}
                  onChange={(value: string) => {
                    setSearchQuery(value);
                    // ID인 경우 해당 컨테이너 사이즈 선택
                    const selected = containerSizes.find(size => size.id === value);
                    if (selected) {
                      handleSelectContainerSize(selected);
                    }
                  }}
                  freeInput={true}
                />
              </div>
              <Button onClick={handleAddContainerSize}>
                <Plus className="mr-2 h-4 w-4" /> 추가
              </Button>
            </div>
            
            {/* 용기 사이즈 목록 */}
            {isLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : filteredContainerSizes.length === 0 ? (
              <div className="text-center py-8">
                {searchQuery ? (
                  <div>
                    <p className="mb-4">'{searchQuery}' 검색 결과가 없습니다.</p>
                    <Button onClick={handleCreateNewSize}>
                      <PlusCircle className="mr-2 h-4 w-4" /> '{searchQuery}' 용기 사이즈 추가
                    </Button>
                  </div>
                ) : (
                  '등록된 용기 사이즈가 없습니다.'
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContainerSizes.map(containerSize => (
                  <Card key={containerSize.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-medium">{containerSize.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditContainerSize(containerSize)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(containerSize)}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {containerSize.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{containerSize.description}</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => handleSelectContainerSize(containerSize)}
                      >
                        선택
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            
            {/* 일치하는 항목이 없고 검색어가 있을 경우 새 항목 추가 */}
            {!isExactMatch && searchQuery && !isLoading && (
              <div className="text-center py-2">
                <Button onClick={handleCreateNewSize}>
                  <PlusCircle className="mr-2 h-4 w-4" /> '{searchQuery}' 용기 사이즈 추가
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>취소</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 용기 사이즈 추가/수정 모달 */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? '용기 사이즈 추가' : '용기 사이즈 수정'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>용기 사이즈 이름</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="예: 소, 중, 대, 특대" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="용기 사이즈에 대한 설명 (선택사항)" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormModalOpen(false)}>
                  취소
                </Button>
                <Button type="submit">
                  {formMode === 'create' ? '추가' : '수정'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>용기 사이즈 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <span className="font-semibold">{containerSizeToDelete?.name}</span> 용기 사이즈를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContainerSize} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 