'use client';

import { useState, useEffect } from 'react';
import { formatDate, getUserDisplayName, getInitials } from '@/lib/utils/admin';
import { DeleteCompanyDialog } from '@/components/admin/dialogs/DeleteCompanyDialog';
import { useRouter } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MoreHorizontal, 
  Search, 
  Building,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from 'react';

// 회사 역할 타입
type CompanyRole = 'owner' | 'admin' | 'member';

// 회사 멤버 인터페이스
interface CompanyMember {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  role: CompanyRole;
  profileCompleted?: boolean;
  profile?: {
    name: string;
    phoneNumber: string;
    affiliation: string;
  };
}

interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
}

export default function CompanyManagement() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyMembers, setCompanyMembers] = useState<Record<string, CompanyMember[]>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteCompanyConfirmOpen, setDeleteCompanyConfirmOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // 회사 목록 로드
  useEffect(() => {
    async function loadCompanies() {
      try {
        const response = await fetch('/api/admin/companies');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '회사 목록을 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setCompanies(data.companies);
        
        // 회사 생성자 이름 매핑
        const creatorIds = data.companies.map((company: Company) => company.created_by).filter(Boolean);
        await loadCreatorNames(creatorIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        console.error('Failed to load companies:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadCompanies();
  }, []);

  // 회사 생성자 이름 로드
  async function loadCreatorNames(userIds: string[]) {
    try {
      if (!userIds.length) return;
      
      const uniqueIds = [...new Set(userIds)];
      const response = await fetch('/api/admin/users/names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: uniqueIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatorNames(data.names);
      }
    } catch (error) {
      console.error('Failed to load creator names:', error);
    }
  }
  
  // 생성자 이름 표시 함수
  const getCreatorName = (creatorId: string) => {
    return creatorNames[creatorId] || creatorId;
  };
  
  // 멤버 토글 함수
  const toggleCompanyMembers = async (companyId: string) => {
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(companyId);
      
      if (!companyMembers[companyId] || companyMembers[companyId].length === 0) {
        try {
          setLoadingMembers(prev => ({
            ...prev,
            [companyId]: true
          }));
          
          const membersResponse = await fetch(`/api/admin/companies/${companyId}/members`);
          if (membersResponse.ok) {
            const membersResult = await membersResponse.json();
            setCompanyMembers(prev => ({
              ...prev,
              [companyId]: membersResult.members || []
            }));
          } else {
            console.error(`회사 ${companyId}의 멤버 데이터를 가져오는데 실패했습니다.`);
          }
        } catch (error) {
          console.error(`회사 ${companyId}의 멤버 로딩 중 오류 발생:`, error);
        } finally {
          setLoadingMembers(prev => ({
            ...prev,
            [companyId]: false
          }));
        }
      }
    }
  };

  // 회사 삭제 핸들러
  const handleDeleteCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회사 삭제에 실패했습니다.');
      }
      
      // 성공 시 목록에서 제거
      setCompanies(companies.filter(company => company.id !== companyId));
      
      alert('회사가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('회사 삭제 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      throw error;
    }
  };

  // 회사 삭제 확인 다이얼로그 열기
  const openDeleteCompanyDialog = (company: Company) => {
    setSelectedCompany(company);
    setDeleteCompanyConfirmOpen(true);
  };

  // 필터링된 회사 목록
  const filteredCompanies = companies.filter(company => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchTermLower) ||
      (company.description && company.description.toLowerCase().includes(searchTermLower))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">회사 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">오류 발생</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.refresh()} variant="outline">
            다시 시도
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">회사 관리</CardTitle>
            <CardDescription>
              총 {companies.length}개 회사가 등록되어 있습니다. 현재 {filteredCompanies.length}개가 표시되고 있습니다.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="회사명 또는 설명으로 검색..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회사명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>생성자</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      검색 조건에 맞는 회사가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <React.Fragment key={company.id}>
                      <TableRow className={expandedCompany === company.id ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2 h-6 w-6 p-0"
                              onClick={() => toggleCompanyMembers(company.id)}
                            >
                              {expandedCompany === company.id ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                            </Button>
                            {company.name}
                          </div>
                        </TableCell>
                        <TableCell>{company.description || '-'}</TableCell>
                        <TableCell>{new Date(company.created_at).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>{getCreatorName(company.created_by)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">메뉴</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>회사 관리</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/admin/companies/${company.id}`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                상세정보 편집
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteCompanyDialog(company)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                회사 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {expandedCompany === company.id && (
                        <TableRow className="bg-muted/10">
                          <TableCell colSpan={5} className="py-2">
                            <div className="pl-8 pr-2 py-2">
                              <h4 className="text-sm font-medium mb-2">회사 멤버 목록</h4>
                              {loadingMembers[company.id] ? (
                                <div className="flex items-center justify-center p-2">
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                  <span className="ml-2 text-sm text-muted-foreground">멤버 정보를 불러오는 중...</span>
                                </div>
                              ) : companyMembers[company.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {companyMembers[company.id].map((member) => (
                                    <div key={member.id} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={member.imageUrl} alt={getUserDisplayName(member)} />
                                          <AvatarFallback>{getInitials(member)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{getUserDisplayName(member)}</span>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {member.role === 'owner' ? '소유자' : 
                                         member.role === 'admin' ? '관리자' : '멤버'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">멤버 정보가 없습니다.</div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* 회사 삭제 확인 다이얼로그 */}
      <DeleteCompanyDialog
        open={deleteCompanyConfirmOpen}
        setOpen={setDeleteCompanyConfirmOpen}
        company={selectedCompany}
        onDelete={handleDeleteCompany}
      />
    </Card>
  );
} 