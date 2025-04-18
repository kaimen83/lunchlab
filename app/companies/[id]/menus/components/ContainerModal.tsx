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
import { AlertTriangle, Loader2 } from 'lucide-react';

// 컨테이너 데이터 타입
export interface Container {
  id: string;
  name: string;
  code_name?: string;
  description?: string;
  price?: number;
  created_at: string;
  updated_at?: string;
}

// 폼 스키마
const containerSchema = z.object({
  name: z.string().min(1, { message: '용기 이름은 필수입니다.' }),
  code_name: z.string().max(50, { message: '코드명은 50자 이하여야 합니다.' }).optional(),
  description: z.string().max(200, { message: '설명은 200자 이하여야 합니다.' }).optional(),
  price: z.union([
    z.number().nonnegative({ message: '가격은 0 이상이어야 합니다.' }),
    z.undefined()
  ])
});

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
  
  // 코드명 중복 체크 관련 상태
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeExists, setCodeExists] = useState(false);

  // 폼 초기화
  const form = useForm<z.infer<typeof containerSchema>>({
    resolver: zodResolver(containerSchema),
    defaultValues: {
      name: container?.name || '',
      code_name: container?.code_name || '',
      description: container?.description || '',
      price: container?.price,
    }
  });

  // 코드명 상태 감시
  const currentCodeName = form.watch('code_name');
  const initialCodeName = container?.code_name || ''; // 초기 코드명 (편집 모드일 때 사용)

  // container 값이 변경될 때마다 폼 값 재설정
  useEffect(() => {
    if (open) {
      form.reset({
        name: container?.name || '',
        code_name: container?.code_name || '',
        description: container?.description || '',
        price: container?.price,
      });
      // 모달이 열릴 때 코드명 중복 상태 초기화
      setCodeExists(false);
    }
  }, [container, open, form]);

  // 실시간 코드명 중복 체크 함수
  const checkCodeName = async (code: string) => {
    if (!code || code.trim() === '') {
      setCodeExists(false);
      form.clearErrors('code_name');
      return;
    }
    
    // 수정 모드에서 코드명이 변경되지 않았다면 중복 체크 필요 없음
    if (isEditMode && code === initialCodeName) {
      setCodeExists(false);
      form.clearErrors('code_name');
      return;
    }
    
    setIsCheckingCode(true);
    try {
      // excludeId 파라미터 추가 (편집 모드에서 현재 아이템 제외)
      const excludeIdParam = isEditMode && container?.id ? `&excludeId=${container.id}` : '';
      
      // fetch 요청으로 코드명 중복 확인
      const response = await fetch(
        `/api/companies/${companyId}/containers/check-code?code=${encodeURIComponent(code)}${excludeIdParam}`
      );
      
      if (!response.ok) {
        console.error('[ContainerModal] 코드명 중복 확인 요청 실패:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('[ContainerModal] 코드명 중복 체크 결과:', data);
      
      // 중복 여부 설정 및 에러 표시
      setCodeExists(data.exists);
      
      if (data.exists) {
        // 어떤 테이블에서 중복되었는지에 따라 다른 오류 메시지 표시
        let errorMessage = '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.';
        
        if (data.ingredientsExists) {
          errorMessage = '이미 식재료 코드명으로 사용 중입니다. 다른 코드명을 사용해주세요.';
        } else if (data.containersExists) {
          errorMessage = '이미 용기 코드명으로 사용 중입니다. 다른 코드명을 사용해주세요.';
        }
        
        form.setError('code_name', { 
          type: 'manual', 
          message: errorMessage
        });
      } else {
        form.clearErrors('code_name');
      }
    } catch (error) {
      console.error('[ContainerModal] 코드명 체크 오류:', error);
    } finally {
      setIsCheckingCode(false);
    }
  };
  
  // 코드명 변경 시 중복 체크 실행 (디바운스 적용)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentCodeName) {
        checkCodeName(currentCodeName);
      } else {
        setCodeExists(false);
        form.clearErrors('code_name');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentCodeName, companyId, initialCodeName, isEditMode, container?.id, form]);

  // 폼 제출 처리
  const onSubmit = async (data: z.infer<typeof containerSchema>) => {
    // 코드명 중복 체크 중이거나 중복이 있으면 제출 방지
    if (isCheckingCode || codeExists) {
      if (codeExists) {
        toast({
          title: '코드명 중복',
          description: '중복된 코드명이 있습니다. 다른 코드명을 사용해주세요.',
          variant: 'destructive',
        });
      }
      return;
    }

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
                    <Input 
                      {...field} 
                      placeholder="예: 소형 플라스틱 용기, 대형 종이 도시락" 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code_name"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>코드명</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...fieldProps} 
                        value={value || ""} 
                        onChange={(e) => {
                          onChange(e.target.value);
                          console.log('[ContainerModal] 코드명 변경:', e.target.value);
                        }}
                        placeholder="예: CT001, 소플라용기" 
                        className={codeExists ? "border-red-500 pr-10" : ""}
                      />
                      {codeExists && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <div className="mt-1 text-sm">
                    {isCheckingCode && <p className="text-muted-foreground">코드명 중복 확인 중...</p>}
                  </div>
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
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>가격 (원)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="용기 가격"
                        value={field.value === undefined ? '' : field.value}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? undefined : Number(value));
                        }}
                        className="pl-10"
                      />
                      <div className="absolute left-3 top-0 h-full flex items-center text-muted-foreground">
                        ₩
                      </div>
                    </div>
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
                disabled={isSubmitting || isCheckingCode || codeExists}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : isEditMode ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 