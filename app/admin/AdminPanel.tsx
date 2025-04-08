'use client';

import { useState } from 'react';
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
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  role: UserRole;
  createdAt: string;
  profileCompleted?: boolean;
  profile?: UserProfile;
}

interface AdminPanelProps {
  users: User[];
}

export default function AdminPanel({ users }: AdminPanelProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      
      if (!response.ok) throw new Error('역할 변경에 실패했습니다.');
      
      toast({
        title: "권한 변경 완료",
        description: "사용자 권한이 성공적으로 변경되었습니다."
      });
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "오류 발생",
        description: "권한 변경 중 오류가 발생했습니다.",
        variant: "destructive"
      });
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
    switch (role) {
      case 'headAdmin': return '최고 관리자';
      case 'user': return '일반 사용자';
      case 'tester': return '테스터';
      default: return '알 수 없음';
    }
  };

  const getUserDisplayName = (user: User): string => {
    if (user.profileCompleted && user.profile?.name) {
      return user.profile.name;
    }
    
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return '이름 없음';
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">관리자 페이지</h1>
      
      <Table>
        <TableCaption>전체 사용자 목록</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>권한</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {getUserDisplayName(user)}
              </TableCell>
              <TableCell>{user.email}</TableCell>
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
                <option value="user">일반사용자</option>
                <option value="tester">테스터</option>
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