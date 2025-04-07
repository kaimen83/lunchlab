'use client';

import { useState, useEffect } from 'react';
import { Building, Search, PlusCircle, Clock, UserCheck, X, Send } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  status: 'none' | 'pending' | 'accepted' | 'rejected' | 'member';
}

export default function CompanySearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // 검색어가 변경되면 회사 검색
  useEffect(() => {
    if (debouncedSearchQuery.trim().length === 0) {
      setCompanies([]);
      return;
    }
    
    searchCompanies(debouncedSearchQuery);
  }, [debouncedSearchQuery]);
  
  // 회사 검색 함수
  const searchCompanies = async (query: string) => {
    if (query.trim().length === 0) return;
    
    try {
      setIsSearching(true);
      const response = await fetch(`/api/companies/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회사 검색에 실패했습니다.');
      }
      
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('회사 검색 중 오류:', error);
      toast({
        title: '회사 검색 실패',
        description: error instanceof Error ? error.message : '회사 검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // 검색 폼 제출 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length === 0) return;
    
    searchCompanies(searchQuery);
  };
  
  // 가입 신청 모달 열기
  const openJoinRequestDialog = (company: Company) => {
    setSelectedCompany(company);
    setMessage('');
    setIsDialogOpen(true);
  };
  
  // 가입 신청 제출
  const submitJoinRequest = async () => {
    if (!selectedCompany) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/companies/join-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          message: message.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '가입 신청에 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 성공 메시지 표시
      toast({
        title: '가입 신청 완료',
        description: data.message || '가입 신청이 성공적으로 접수되었습니다.',
      });
      
      // 신청 후 회사 상태 업데이트
      setCompanies(prevCompanies => 
        prevCompanies.map(company => 
          company.id === selectedCompany.id
            ? { ...company, status: 'pending' }
            : company
        )
      );
      
      // 모달 닫기
      setIsDialogOpen(false);
    } catch (error) {
      console.error('가입 신청 중 오류:', error);
      toast({
        title: '가입 신청 실패',
        description: error instanceof Error ? error.message : '가입 신청 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 상태에 따른 버튼 렌더링
  const renderActionButton = (company: Company) => {
    switch (company.status) {
      case 'member':
        return (
          <Button variant="outline" disabled className="flex items-center">
            <UserCheck className="w-4 h-4 mr-2" />
            이미 가입됨
          </Button>
        );
      case 'pending':
        return (
          <Button variant="outline" disabled className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            가입 신청 중
          </Button>
        );
      case 'rejected':
        return (
          <Button 
            variant="outline" 
            onClick={() => openJoinRequestDialog(company)}
            className="flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            다시 신청하기
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            onClick={() => openJoinRequestDialog(company)}
            className="flex items-center"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            가입 신청
          </Button>
        );
    }
  };
  
  return (
    <div>
      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="회사 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? '검색 중...' : '검색'}
        </Button>
      </form>
      
      {/* 검색 결과 목록 */}
      {isSearching ? (
        <div className="flex justify-center my-8">
          <p>검색 중...</p>
        </div>
      ) : companies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-500" />
                  {company.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-gray-600">
                  {company.description || '회사 설명이 없습니다.'}
                </p>
              </CardContent>
              <CardFooter>
                {renderActionButton(company)}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : debouncedSearchQuery ? (
        <div className="flex flex-col items-center justify-center py-8">
          <X className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-500">검색 결과가 없습니다.</p>
        </div>
      ) : null}
      
      {/* 가입 신청 모달 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회사 가입 신청</DialogTitle>
            <DialogDescription>
              {selectedCompany?.name}에 가입 신청을 보냅니다. 선택적으로 메시지를 입력할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label htmlFor="message" className="text-sm font-medium mb-2 block">
              가입 신청 메시지 (선택사항)
            </label>
            <Textarea
              id="message"
              placeholder="회사에 전달할 메시지를 입력하세요."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button 
              onClick={submitJoinRequest}
              disabled={isSubmitting}
              className="flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? '요청 중...' : '신청하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 