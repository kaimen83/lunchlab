'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

// 회사 정보 스키마
const companySchema = z.object({
  name: z.string().min(1, { message: '회사명은 필수입니다.' }),
  description: z.string().optional(),
});

// 컴포넌트 props 타입
interface CompanyEditFormProps {
  company: {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    created_by: string;
    updated_at?: string;
  };
}

export default function CompanyEditForm({ company }: CompanyEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 폼 초기화
  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      description: company.description || '',
    },
  });
  
  // 폼 제출 핸들러
  const onSubmit = async (data: z.infer<typeof companySchema>) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회사 정보 업데이트에 실패했습니다.');
      }
      
      toast({
        title: '회사 정보 업데이트 성공',
        description: '회사 정보가 성공적으로 업데이트되었습니다.',
      });
      
      // 관리자 페이지로 리다이렉트
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('회사 정보 업데이트 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '회사 정보 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Button 
        variant="outline" 
        onClick={() => router.back()} 
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        뒤로 가기
      </Button>
      
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>회사명</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="회사명을 입력하세요" />
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
                    <FormLabel>회사 설명</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="회사에 대한 설명을 입력하세요"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : '저장'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm font-medium">회사 아이디</span>
              <span className="col-span-2 text-sm">{company.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm font-medium">생성일</span>
              <span className="col-span-2 text-sm">
                {new Date(company.created_at).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="text-sm font-medium">생성자</span>
              <span className="col-span-2 text-sm">{company.created_by}</span>
            </div>
            {company.updated_at && (
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm font-medium">최종 수정일</span>
                <span className="col-span-2 text-sm">
                  {new Date(company.updated_at).toLocaleString('ko-KR')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 