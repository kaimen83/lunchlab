'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from './CategoryModal';

// 컨테이너 데이터 타입
export interface Container {
  id: string;
  name: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at?: string;
}

// 폼 스키마
const containerSchema = z.object({
  name: z.string().min(1, { message: '용기 이름은 필수입니다.' }),
  description: z.string().max(200, { message: '설명은 200자 이하여야 합니다.' }).optional(),
  category: z.string().optional(),
});

type ContainerFormValues = z.infer<typeof containerSchema>;

interface ContainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  container?: Container;
  onSuccess?: () => void;
}

export default function ContainerModal({
  open,
  onOpenChange,
  companyId,
  container,
  onSuccess,
}: ContainerModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const isEditMode = !!container;

  // 카테고리 목록 불러오기
  const fetchCategories = async () => {
    if (!open) return;
    
    setLoadingCategories(true);
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
        title: '알림',
        description: '카테고리 목록을 불러오는데 실패했습니다. 기본 카테고리를 사용합니다.',
        variant: 'default',
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // 폼 초기화
  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerSchema),
    defaultValues: {
      name: container?.name || '',
      description: container?.description || '',
      category: container?.category || '',
    }
  });

  // 모달이 열릴 때 카테고리 목록 로드
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, companyId]);

  // container 값이 변경될 때마다 폼 값 재설정
  useEffect(() => {
    if (open) {
      form.reset({
        name: container?.name || '',
        description: container?.description || '',
        category: container?.category || '',
      });
    }
  }, [container, open, form]);

  // 폼 제출 처리
  const onSubmit = async (data: ContainerFormValues) => {
    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `/api/companies/${companyId}/containers/${container.id}`
        : `/api/companies/${companyId}/containers`;
      
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '용기 저장 중 오류가 발생했습니다.');
      }

      toast({
        title: isEditMode ? '용기 수정 완료' : '용기 추가 완료',
        description: `${data.name} 용기가 ${isEditMode ? '수정' : '추가'}되었습니다.`,
      });

      // 성공 후 모달 닫기
      onOpenChange(false);
      
      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('용기 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 카테고리 옵션 - 사용자 정의 카테고리와 기본 카테고리 결합
  const categoryOptions = [
    ...categories.map(cat => ({ label: cat.name, value: cat.code })),
    // 기본 카테고리 (사용자 정의 카테고리가 없거나 기본값으로 사용할 경우)
    { label: '플라스틱', value: 'plastic' },
    { label: '종이', value: 'paper' },
    { label: '유리', value: 'glass' },
    { label: '금속', value: 'metal' },
    { label: '친환경', value: 'eco' },
    { label: '기타', value: 'other' },
  ];

  // 중복 제거
  const uniqueCategoryOptions = Array.from(new Map(
    categoryOptions.map(option => [option.value, option])
  ).values());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '용기 수정' : '새 용기 추가'}</DialogTitle>
          <DialogDescription>
            메뉴를 담을 용기 정보를 입력하세요. 용기 크기와 종류는 원가 계산과 재고 관리에 활용됩니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>용기 이름</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: 소형 플라스틱 용기, 대형 종이 도시락" />
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
                      {...field}
                      placeholder="용기에 대한 설명이나 메모를 입력하세요"
                      rows={2}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>분류</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingCategories ? "카테고리 불러오는 중..." : "용기 분류 선택"} />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategoryOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : isEditMode ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 