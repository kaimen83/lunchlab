'use client';

import { useState, useEffect } from 'react';
import { UserRole, UserProfile } from '@/lib/types';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MoreHorizontal, 
  Search, 
  UserCheck, 
  Users, 
  Shield, 
  Clock, 
  Filter,
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

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  role: UserRole;
  profileCompleted?: boolean;
  profile?: UserProfile;
  createdAt: string;
  lastSignInAt?: string;
}

// 회사 역할 타입
type CompanyRole = 'owner' | 'admin' | 'member';

// 회사 멤버 인터페이스
interface CompanyMember extends Omit<User, 'role'> {
  role: CompanyRole;
}

// TouchEventFixer 유틸리티 함수 추가
const removePointerEventsFromBody = () => {
  if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = '';
  }
};

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyMembers, setCompanyMembers] = useState<Record<string, CompanyMember[]>>({});
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [adminTab, setAdminTab] = useState('users');
  const [deleteCompanyConfirmOpen, setDeleteCompanyConfirmOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // 사용자 목록 로드
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/users/get-all');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '사용자 목록을 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        console.error('Failed to load users:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUsers();
  }, []);

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
        const creatorIds = data.companies.map((company: any) => company.created_by).filter(Boolean);
        await loadCreatorNames(creatorIds);
      } catch (err) {
        setCompanyError(err instanceof Error ? err.message : '오류가 발생했습니다.');
        console.error('Failed to load companies:', err);
      } finally {
        setIsLoadingCompanies(false);
      }
    }
    
    if (adminTab === 'companies') {
      loadCompanies();
    }
  }, [adminTab]);

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

  // touchEventFixer를 위한 글로벌 이벤트 리스너 추가
  useEffect(() => {
    const handlePointerEvent = () => {
      if (typeof document !== "undefined" && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener("pointerup", handlePointerEvent);
    document.addEventListener("touchend", handlePointerEvent);

    // 클린업 함수
    return () => {
      document.removeEventListener("pointerup", handlePointerEvent);
      document.removeEventListener("touchend", handlePointerEvent);
    };
  }, []);

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          role: selectedRole
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '권한 변경에 실패했습니다.');
      }
      
      // 성공적으로 업데이트 후 사용자 목록 갱신
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id ? { ...user, role: selectedRole } : user
      );
      
      setUsers(updatedUsers);
      setDialogOpen(false);
      // Dialog가 닫힐 때 pointer-events 스타일 제거
      removePointerEventsFromBody();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('권한 변경 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    } finally {
      setIsUpdating(false);
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setDialogOpen(true);
  };

  const getRoleName = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
      headAdmin: '최고 관리자',
      user: '일반사용자',
      tester: '테스터'
    };
    return roleMap[role] || '일반사용자';
  };

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
    const variantMap: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
      headAdmin: "destructive",
      user: "default",
      tester: "secondary"
    };
    return variantMap[role] || "default";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '정보 없음';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // 사용자 표시 이름 가져오기
  const getUserDisplayName = (user: User | CompanyMember): string => {
    if (user.profileCompleted && user.profile?.name) {
      return user.profile.name;
    }
    
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    
    return user.email?.split('@')[0] || '이름 없음';
  };

  // 사용자 이니셜 가져오기
  const getInitials = (user: User | CompanyMember): string => {
    const name = getUserDisplayName(user);
    return name.substring(0, 2).toUpperCase();
  };

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    // 검색어 필터링
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTermLower) || 
      getUserDisplayName(user).toLowerCase().includes(searchTermLower) ||
      user.profile?.affiliation?.toLowerCase().includes(searchTermLower) ||
      user.profile?.phoneNumber?.includes(searchTerm);
    
    // 역할 필터링
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // 활성 탭 필터링
    let matchesTab = true;
    if (activeTab === 'recent') {
      // 최근 1주일 내 가입한 사용자
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      matchesTab = new Date(user.createdAt) >= oneWeekAgo;
    } else if (activeTab === 'inactive') {
      // 마지막 로그인이 30일 이상 지난 사용자 또는 로그인 기록이 없는 사용자
      if (!user.lastSignInAt) {
        matchesTab = true;
      } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchesTab = new Date(user.lastSignInAt) < thirtyDaysAgo;
      }
    }
    
    return matchesSearch && matchesRole && matchesTab;
  });

  // 회사 삭제 핸들러
  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    
    try {
      const response = await fetch(`/api/admin/companies/${selectedCompany.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회사 삭제에 실패했습니다.');
      }
      
      // 성공 시 목록에서 제거
      setCompanies(companies.filter(company => company.id !== selectedCompany.id));
      setDeleteCompanyConfirmOpen(false);
      setSelectedCompany(null);
      
      alert('회사가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('회사 삭제 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  // 회사 삭제 확인 다이얼로그 열기
  const openDeleteCompanyDialog = (company: any) => {
    setSelectedCompany(company);
    setDeleteCompanyConfirmOpen(true);
  };

  // 필터링된 회사 목록
  const filteredCompanies = companies.filter(company => {
    const searchTermLower = companySearchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchTermLower) ||
      (company.description && company.description.toLowerCase().includes(searchTermLower))
    );
  });

  if (isLoading && adminTab === 'users') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">사용자 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isLoadingCompanies && adminTab === 'companies') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">회사 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && adminTab === 'users') {
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

  if (companyError && adminTab === 'companies') {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">오류 발생</CardTitle>
          <CardDescription>{companyError}</CardDescription>
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
    <div className="space-y-6">
      <Tabs defaultValue="users" value={adminTab} onValueChange={setAdminTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building className="mr-2 h-4 w-4" />
            회사 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">사용자 관리</CardTitle>
                  <CardDescription>
                    총 {users.length}명의 사용자가 있습니다. 현재 {filteredUsers.length}명이 표시되고 있습니다.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Tabs 
                  defaultValue="all" 
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="mb-6"
                >
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="all">모든 사용자</TabsTrigger>
                    <TabsTrigger value="recent">최근 가입</TabsTrigger>
                    <TabsTrigger value="inactive">장기 미접속</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="이름, 이메일, 소속 등으로 검색..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="역할로 필터" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">모든 역할</SelectItem>
                        <SelectItem value="headAdmin">최고 관리자</SelectItem>
                        <SelectItem value="user">일반사용자</SelectItem>
                        <SelectItem value="tester">테스터</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Tabs>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead>소속</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>최종 접속일</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            검색 또는 필터 조건에 맞는 사용자가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage src={user.imageUrl} alt={getUserDisplayName(user)} />
                                  <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium leading-none">{getUserDisplayName(user)}</span>
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.profile?.affiliation || '-'}</TableCell>
                            <TableCell>{user.profile?.phoneNumber || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {getRoleName(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(user.createdAt)}</TableCell>
                            <TableCell className="text-sm">{formatDate(user.lastSignInAt)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu onOpenChange={(open) => {
                                if (!open) {
                                  removePointerEventsFromBody();
                                }
                              }}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">메뉴</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>사용자 관리</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openRoleDialog(user)} onSelect={(e) => e.preventDefault()}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    권한 변경
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
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
                      value={companySearchTerm}
                      onChange={(e) => setCompanySearchTerm(e.target.value)}
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* 사용자 권한 변경 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          // Dialog가 닫힐 때 pointer-events 스타일 제거
          if (!open) {
            removePointerEventsFromBody();
          }
        }}
      >
        <DialogContent 
          onPointerDownOutside={(e) => {
            // Dialog 내부 클릭 시 이벤트 전파 방지
            if (e.target instanceof HTMLElement && e.target.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>사용자 권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.email} 사용자의 권한을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">현재 권한</label>
              <span className="col-span-3">
                {selectedUser && (
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                    {getRoleName(selectedUser.role)}
                  </Badge>
                )}
              </span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">새 권한</label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="새 권한 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headAdmin">최고 관리자</SelectItem>
                  <SelectItem value="user">일반사용자</SelectItem>
                  <SelectItem value="tester">테스터</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => {
              setDialogOpen(false);
              // Dialog가 닫힐 때 pointer-events 스타일 제거
              removePointerEventsFromBody();
            }} variant="outline">취소</Button>
            <Button onClick={handleRoleChange} disabled={isUpdating}>
              {isUpdating ? '처리 중...' : '권한 변경'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 회사 삭제 확인 다이얼로그 */}
      <Dialog open={deleteCompanyConfirmOpen} onOpenChange={setDeleteCompanyConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회사 삭제 확인</DialogTitle>
            <DialogDescription>
              '{selectedCompany?.name}' 회사를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 회사에 연결된 모든 데이터가 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCompanyConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCompany}>
              삭제 확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 