'use client';

import { useState } from 'react';
import { UserRole } from '@/lib/types';
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
import { updateUserRole } from '@/lib/clerk';
import { useRouter } from 'next/navigation';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from 'lucide-react';

interface User {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  role: UserRole;
  createdAt: string;
}

interface AdminPanelProps {
  users: User[];
}

export default function AdminPanel({ users }: AdminPanelProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('pending');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      await updateUserRole(selectedUser.id, selectedRole);
      setDialogOpen(false);
      router.refresh(); // 페이지 데이터 새로고침
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('권한 변경 중 오류가 발생했습니다.');
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
      admin: '관리자',
      employee: '일반직원',
      viewer: '뷰어',
      pending: '가입대기'
    };
    return roleMap[role] || '가입대기';
  };

  return (
    <div>
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
                {user.firstName} {user.lastName}
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
                <option value="admin">관리자</option>
                <option value="employee">일반직원</option>
                <option value="viewer">뷰어</option>
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