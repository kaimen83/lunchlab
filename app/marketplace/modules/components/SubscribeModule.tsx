'use client';

import { useState } from 'react';
import { Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SubscribeModuleProps {
  moduleId: string;
  companies: Array<Company & { role: string }>;
}

export function SubscribeModule({ moduleId, companies }: SubscribeModuleProps) {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 관리자 권한이 있는 회사만 필터링
  const adminCompanies = companies.filter(company => 
    company.role === 'owner' || company.role === 'admin'
  );
  
  const handleSubscribe = async () => {
    if (!selectedCompanyId) {
      toast.error('회사를 선택해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/modules/${moduleId}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '구독 신청 중 오류가 발생했습니다.');
      }
      
      toast.success('구독 신청이 완료되었습니다.');
      
      // 구독 성공 후 회사 페이지로 이동
      router.push(`/companies/${selectedCompanyId}`);
    } catch (error) {
      console.error('구독 오류:', error);
      toast.error(error instanceof Error ? error.message : '구독 신청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (adminCompanies.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-muted/40">
        <h3 className="text-lg font-medium mb-3">구독 권한 없음</h3>
        <p className="text-muted-foreground mb-4">
          모듈을 구독하려면 회사의 관리자 또는 소유자 권한이 필요합니다.
        </p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">모듈 구독하기</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="company-select" className="text-sm font-medium">
            구독할 회사 선택
          </label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger id="company-select">
              <SelectValue placeholder="회사 선택" />
            </SelectTrigger>
            <SelectContent>
              {adminCompanies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleSubscribe} 
          disabled={!selectedCompanyId || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          구독 신청하기
        </Button>
      </div>
    </div>
  );
} 