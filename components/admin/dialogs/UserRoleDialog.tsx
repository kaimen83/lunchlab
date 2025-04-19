'use client';

import { useState } from 'react';
import { UserRole } from '@/lib/types';
import { getRoleName, getRoleBadgeVariant, removePointerEventsFromBody } from '@/lib/utils/admin';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserRoleDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedUser: {
    id: string;
    email?: string;
    role: UserRole;
  } | null;
  onRoleChange: (userId: string, newRole: UserRole) => Promise<void>;
}

export function UserRoleDialog({ 
  open, 
  setOpen, 
  selectedUser, 
  onRoleChange 
}: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(selectedUser?.role || 'user');
  const [isUpdating, setIsUpdating] = useState(false);

  // 역할 선택이 변경될 때 상태 업데이트
  const handleRoleSelect = (value: string) => {
    setSelectedRole(value as UserRole);
  };

  // 역할 변경 처리
  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    try {
      await onRoleChange(selectedUser.id, selectedRole);
      setOpen(false);
      // Dialog가 닫힐 때 pointer-events 스타일 제거
      removePointerEventsFromBody();
    } catch (error) {
      console.error('Error in role change dialog:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        setOpen(open);
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
            <Select value={selectedRole} onValueChange={handleRoleSelect}>
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
            setOpen(false);
            // Dialog가 닫힐 때 pointer-events 스타일 제거
            removePointerEventsFromBody();
          }} variant="outline">취소</Button>
          <Button onClick={handleRoleChange} disabled={isUpdating}>
            {isUpdating ? '처리 중...' : '권한 변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 