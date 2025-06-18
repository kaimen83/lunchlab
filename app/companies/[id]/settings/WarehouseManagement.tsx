'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Warehouse, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Warehouse {
  id: string;
  name: string;
  description?: string;
  address?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WarehouseManagementProps {
  companyId: string;
}

export function WarehouseManagement({ companyId }: WarehouseManagementProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    is_default: false
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // 창고 목록 조회
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/warehouses`);
      
      if (!response.ok) {
        throw new Error('창고 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setWarehouses(data.warehouses || []);
    } catch (error) {
      console.error('창고 목록 조회 오류:', error);
      toast({
        title: '오류 발생',
        description: '창고 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [companyId]);

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      is_default: false
    });
  };

  // 창고 생성
  const handleCreateWarehouse = async () => {
    if (!formData.name.trim()) {
      toast({
        title: '입력 오류',
        description: '창고명을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/companies/${companyId}/warehouses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '창고 생성에 실패했습니다.');
      }

      toast({
        title: '성공',
        description: '새 창고가 생성되었습니다.',
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (error) {
      console.error('창고 생성 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '창고 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 창고 수정
  const handleEditWarehouse = async () => {
    if (!formData.name.trim() || !editingWarehouse) {
      toast({
        title: '입력 오류',
        description: '창고명을 입력해주세요.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/companies/${companyId}/warehouses/${editingWarehouse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '창고 수정에 실패했습니다.');
      }

      toast({
        title: '성공',
        description: '창고 정보가 수정되었습니다.',
      });

      setIsEditDialogOpen(false);
      setEditingWarehouse(null);
      resetForm();
      fetchWarehouses();
    } catch (error) {
      console.error('창고 수정 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '창고 수정 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 창고 삭제
  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/warehouses/${warehouse.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '창고 삭제에 실패했습니다.');
      }

      toast({
        title: '성공',
        description: `${warehouse.name} 창고가 삭제되었습니다.`,
      });

      fetchWarehouses();
    } catch (error) {
      console.error('창고 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '창고 삭제 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      description: warehouse.description || '',
      address: warehouse.address || '',
      is_default: warehouse.is_default
    });
    setIsEditDialogOpen(true);
  };

  // 생성 다이얼로그 열기
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">창고 목록을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5" />
          <h3 className="text-lg font-semibold">창고 관리</h3>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          새 창고 추가
        </Button>
      </div>

      {/* 창고 목록 테이블 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>창고명</TableHead>
              <TableHead>설명</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  등록된 창고가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {warehouse.name}
                      {warehouse.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          기본
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{warehouse.description || '-'}</TableCell>
                  <TableCell>{warehouse.address || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                      {warehouse.is_active ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(warehouse)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={warehouse.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>창고 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              '{warehouse.name}' 창고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteWarehouse(warehouse)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 창고 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 창고 추가</DialogTitle>
            <DialogDescription>
              새로운 창고 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">창고명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="창고명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="창고에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="창고 주소를 입력하세요"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="is_default">기본 창고로 설정</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleCreateWarehouse} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 창고 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>창고 정보 수정</DialogTitle>
            <DialogDescription>
              창고 정보를 수정해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">창고명 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="창고명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="창고에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">주소</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="창고 주소를 입력하세요"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-is_default">기본 창고로 설정</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingWarehouse(null);
              }}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleEditWarehouse} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 