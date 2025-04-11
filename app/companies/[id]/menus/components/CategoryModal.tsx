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

// 카테고리 데이터 타입
export interface Category {
  id: string;
  name: string;
  code: string;
  company_id: string;
  created_at: string;
}

// 폼 스키마
const categorySchema = z.object({
  name: z.string().min(1, { message: '카테고리 이름은 필수입니다.' }),
  code: z.string().min(1, { message: '카테고리 코드는 필수입니다.' }).max(20, { message: '코드는 20자 이하여야 합니다.' }),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  category?: Category;
  onSuccess?: () => void;
}

export default function CategoryModal({
  open,
  onOpenChange,
  companyId,
  category,
  onSuccess,
}: CategoryModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!category;

  // 폼 초기화
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      code: category?.code || '',
    }
  });

  // category 값이 변경될 때마다 폼 값 재설정
  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name || '',
        code: category?.code || '',
      });
    }
  }, [category, open, form]);

  // 폼 제출 처리
  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `/api/companies/${companyId}/containers/categories/${category.id}`
        : `/api/companies/${companyId}/containers/categories`;
      
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
        throw new Error(errorData.error || '카테고리 저장 중 오류가 발생했습니다.');
      }

      toast({
        title: isEditMode ? '카테고리 수정 완료' : '카테고리 추가 완료',
        description: `${data.name} 카테고리가 ${isEditMode ? '수정' : '추가'}되었습니다.`,
      });

      // 성공 후 모달 닫기
      onOpenChange(false);
      
      // 성공 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('카테고리 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '카테고리 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '카테고리 수정' : '새 카테고리 추가'}</DialogTitle>
          <DialogDescription>
            용기 분류 카테고리를 설정하세요. 카테고리를 사용하면 용기를 효과적으로 분류할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 이름</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: 플라스틱, 종이, 유리" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 코드</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: plastic, paper, glass" />
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