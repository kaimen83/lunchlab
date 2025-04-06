'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyMembership, CompanyMemberRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRoundIcon, Search, Users } from 'lucide-react';
import Image from 'next/image';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
}

interface CompanyMembershipInviteFormProps {
  companyId: string;
  companyName: string;
  currentUserMembership: CompanyMembership;
}

export function CompanyMembershipInviteForm({
  companyId,
  companyName,
  currentUserMembership,
}: CompanyMembershipInviteFormProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<CompanyMemberRole>('member');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 현재 사용자가 owner인지 확인 (owner만 admin 권한 부여 가능)
  const isOwner = currentUserMembership.role === 'owner';
  
  // 사용자 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setError(null);
      setSelectedUserId(null);
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error('사용자 검색에 실패했습니다.');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('사용자 검색 중 오류:', err);
      setError('사용자 검색에 실패했습니다.');
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('초대할 사용자를 선택해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/companies/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          invited_user_id: selectedUserId,
          role,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '초대 생성에 실패했습니다.');
      }
      
      setSuccess('초대가 성공적으로 전송되었습니다.');
      setSelectedUserId(null);
      setSearchQuery('');
      setUsers([]);
      
      // 3초 후 회사 페이지로 리다이렉트
      setTimeout(() => {
        router.push(`/companies/${companyId}`);
      }, 3000);
    } catch (err) {
      console.error('초대 생성 중 오류:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">{companyName}에 멤버 초대</h2>
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="searchQuery">사용자 검색</Label>
            <div className="flex mt-1">
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 이메일로 검색"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="ml-2"
              >
                <Search className="w-4 h-4 mr-2" />
                검색
              </Button>
            </div>
          </div>
          
          {isSearching ? (
            <div className="text-center py-4">검색 중...</div>
          ) : users.length > 0 ? (
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 flex items-center cursor-pointer hover:bg-gray-50 ${
                    selectedUserId === user.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    {user.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt={`${user.firstName || ''} ${user.lastName || ''}`}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <UserRoundIcon className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || '이름 없음'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-4 text-gray-500">검색 결과가 없습니다.</div>
          ) : null}
          
          <div>
            <Label htmlFor="role">권한</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as CompanyMemberRole)}
              disabled={!isOwner && role === 'admin'}
            >
              <SelectTrigger>
                <SelectValue placeholder="권한을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">멤버</SelectItem>
                {isOwner && <SelectItem value="admin">관리자</SelectItem>}
              </SelectContent>
            </Select>
            {!isOwner && role === 'admin' && (
              <p className="text-sm text-gray-500 mt-1">
                관리자는 회사 소유자만 지정할 수 있습니다.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}`)}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedUserId}
            className="flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            {isSubmitting ? '초대 중...' : '초대하기'}
          </Button>
        </div>
      </form>
    </div>
  );
} 