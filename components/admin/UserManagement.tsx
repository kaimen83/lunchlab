'use client';

import { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import { formatDate, getUserDisplayName, getInitials, getRoleName, getRoleBadgeVariant, removePointerEventsFromBody } from '@/lib/utils/admin';
import { UserRoleDialog } from '@/components/admin/dialogs/UserRoleDialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MoreHorizontal, 
  Search, 
  Shield 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  role: UserRole;
  profileCompleted?: boolean;
  profile?: {
    name: string;
    phoneNumber: string;
    affiliation: string;
  };
  createdAt: string;
  lastSignInAt?: string;
}

export default function UserManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [activeTab, setActiveTab] = useState('all');

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

  // 역할 변경 처리 함수
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          role: newRole
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '권한 변경에 실패했습니다.');
      }
      
      // 성공적으로 업데이트 후 사용자 목록 갱신
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      );
      
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('권한 변경 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      throw error;
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">사용자 목록을 불러오는 중...</p>
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

      {/* 사용자 권한 변경 다이얼로그 */}
      <UserRoleDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        selectedUser={selectedUser}
        onRoleChange={handleRoleChange}
      />
    </Card>
  );
} 