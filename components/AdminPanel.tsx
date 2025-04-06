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
}

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('pending');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      companyAdmin: '업체별 관리자',
      worker: '일반사용자',
      tester: '테스터',
      pending: '가입대기'
    };
    return roleMap[role] || '가입대기';
  };

  if (isLoading) {
    return <div className="text-center py-10">사용자 목록을 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700 text-center">
        <p className="font-bold">오류 발생</p>
        <p>{error}</p>
        <Button onClick={() => router.refresh()} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableCaption>전체 사용자 목록</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>소속</TableHead>
            <TableHead>권한</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.profile?.name || '-'}</TableCell>
              <TableCell>{user.profile?.phoneNumber || '-'}</TableCell>
              <TableCell>{user.profile?.affiliation || '-'}</TableCell>
              <TableCell>{getRoleName(user.role)}</TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</TableCell>
              <TableCell>
                <Button 
                  onClick={() => openRoleDialog(user)} 
                  variant="outline" 
                  size="sm"
                >
                  권한 변경
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.email} 사용자의 권한을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">현재 권한</label>
              <span className="col-span-3">{selectedUser ? getRoleName(selectedUser.role) : ''}</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right">새 권한</label>
              <select 
                className="col-span-3 p-2 border rounded"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              >
                <option value="headAdmin">최고 관리자</option>
                <option value="companyAdmin">업체별 관리자</option>
                <option value="worker">일반사용자</option>
                <option value="tester">테스터</option>
                <option value="pending">가입대기</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">취소</Button>
            <Button onClick={handleRoleChange} disabled={isUpdating}>
              {isUpdating ? '처리 중...' : '권한 변경'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 