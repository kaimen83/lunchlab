'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';

export default function MealPlansPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 페이지 로드 시 초기 설정
    setIsLoading(false);
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">식단 관리</h1>
      </div>
      
      <div className="bg-white p-8 rounded-md shadow-sm">
        <div className="text-center py-10">
          <p className="text-lg text-gray-500">식단 관리 페이지가 준비 중입니다.</p>
          <p className="text-sm text-gray-400 mt-2">곧 새로운 기능이 추가될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
} 