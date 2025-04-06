'use client';

import { useState } from 'react';
import { Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Save } from 'lucide-react';

// 폼 스키마 정의
const formSchema = z.object({
  name: z.string().min(2, {
    message: "회사 이름은 최소 2자 이상이어야 합니다.",
  }),
  description: z.string().optional(),
});

interface CompanySettingsFormProps {
  company: Company;
  isOwner: boolean;
}

export function CompanySettingsForm({ company, isOwner }: CompanySettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // 폼 초기화
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: company.name,
      description: company.description || '',
    },
  });
  
  // 폼 제출
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회사 정보 업데이트에 실패했습니다.');
      }
      
      toast({
        title: "업데이트 완료",
        description: "회사 정보가 성공적으로 업데이트되었습니다.",
      });
      
      router.refresh();
    } catch (error) {
      console.error('회사 정보 업데이트 오류:', error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>회사 이름</FormLabel>
              <FormControl>
                <Input 
                  placeholder="회사 이름을 입력하세요" 
                  {...field}
                  disabled={!isOwner || isLoading}
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
              <FormLabel>회사 설명</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="회사에 대한 간략한 설명을 입력하세요"
                  className="resize-none"
                  rows={4}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <span className="flex items-center">
              <span className="mr-2">저장 중...</span>
            </span>
          ) : (
            <span className="flex items-center">
              <Save className="mr-2 h-4 w-4" />
              변경사항 저장
            </span>
          )}
        </Button>
      </form>
    </Form>
  );
} 