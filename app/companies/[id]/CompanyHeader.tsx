'use client';

import { useState } from 'react';
import { Building, Users, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Company, CompanyMembership } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CompanyHeaderProps {
  company: Company;
  membership?: CompanyMembership;
}

export function CompanyHeader({ company, membership }: CompanyHeaderProps) {
  const router = useRouter();
  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin' || isOwner;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 회사 삭제 처리
  const handleDeleteCompany = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '회사 삭제에 실패했습니다.');
      }
      
      // 삭제 성공 시 홈으로 이동
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('회사 삭제 중 오류:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <Building className="h-8 w-8 text-blue-700" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-gray-500 mt-1">
              {company.description || '회사 설명이 없습니다.'}
            </p>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => router.push(`/companies/${company.id}/invite`)}
              className="flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              멤버 초대
            </Button>
          )}
          
          {isOwner && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? '삭제 중...' : '회사 삭제'}
            </Button>
          )}
        </div>
      </div>
      
      {/* 회사 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              회사 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                정말로 회사 '{company.name}'을(를) 삭제하시겠습니까?
              </p>
              <p className="text-red-500 font-medium">
                이 작업은 되돌릴 수 없으며, 모든 회사 데이터와 멤버십이 영구적으로 삭제됩니다.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '회사 삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 