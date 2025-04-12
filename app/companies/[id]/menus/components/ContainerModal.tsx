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

// 컨테이너 데이터 타입
export interface Container {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// 폼 스키마
const containerSchema = z.object({
  name: z.string().min(1, { message: '용기 이름은 필수입니다.' }),
  description: z.string().max(200, { message: '설명은 200자 이하여야 합니다.' }).optional(),
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
  const isEditMode = !!container;

  // 폼 초기화
  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerSchema),
    defaultValues: {
      name: container?.name || '',
      description: container?.description || '',
    }
  });

  // container 값이 변경될 때마다 폼 값 재설정
  useEffect(() => {
    if (open) {
      form.reset({
        name: container?.name || '',
        description: container?.description || '',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '용기 수정' : '새 용기 추가'}</DialogTitle>
          <DialogDescription>
            메뉴를 담을 용기 정보를 입력하세요. 용기 정보는 원가 계산과 재고 관리에 활용됩니다.
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