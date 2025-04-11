'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
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
import CategoryModal, { Category } from './CategoryModal';
import { Badge } from '@/components/ui/badge';

interface CategoryManagerProps {
  companyId: string;
}

export default function CategoryManager({ companyId }: CategoryManagerProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/containers/categories`);
      
      if (!response.ok) {
        throw new Error('카테고리 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('카테고리 불러오기 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '카테고리 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 데이터 로딩
  useEffect(() => {
    fetchCategories();
  }, [companyId]);

  // 카테고리 편집 버튼 클릭
  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setModalOpen(true);
  };

  // 카테고리 삭제 버튼 클릭 
  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  // 카테고리 삭제 처리
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      const response = await fetch(`/api/companies/${companyId}/containers/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '카테고리 삭제 중 오류가 발생했습니다.');
      }
      
      toast({
        title: '카테고리 삭제 완료',
        description: `${categoryToDelete.name} 카테고리가 삭제되었습니다.`,
      });
      
      // 목록 새로고침
      fetchCategories();
    } catch (error) {
      console.error('카테고리 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '카테고리 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  // 새 카테고리 추가
  const handleAddClick = () => {
    setSelectedCategory(undefined);
    setModalOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Tag className="mr-2 h-5 w-5" />
              분류 관리
            </CardTitle>
            <CardDescription>
              용기 분류 카테고리를 추가하고 관리하세요.
            </CardDescription>
          </div>
          <Button onClick={handleAddClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            카테고리 추가
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-4 text-center text-muted-foreground">로딩 중...</div>
        ) : categories.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>코드</TableHead>
                  <TableHead className="w-[120px] text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(category)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(category)}
                          className="h-8 w-8 text-destructive"
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
          <div className="py-6 text-center border rounded-md">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="mb-4 font-medium">등록된 카테고리가 없습니다</p>
            <p className="text-sm text-muted-foreground mb-4">
              '카테고리 추가' 버튼을 클릭하여 새로운 분류를 추가하세요.
            </p>
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              카테고리 추가
            </Button>
          </div>
        )}
      </CardContent>

      {/* 카테고리 추가/수정 모달 */}
      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        companyId={companyId}
        category={selectedCategory}
        onSuccess={fetchCategories}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete?.name} 카테고리를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
              <br />
              <br />
              <strong>주의:</strong> 이 카테고리를 사용 중인 용기가 있으면 삭제할 수 없습니다.
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
    </Card>
  );
} 