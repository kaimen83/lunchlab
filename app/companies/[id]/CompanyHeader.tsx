'use client';

import { Building, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Company, CompanyMembership } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CompanyHeaderProps {
  company: Company;
  membership?: CompanyMembership;
}

export function CompanyHeader({ company, membership }: CompanyHeaderProps) {
  const router = useRouter();
  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin' || isOwner;
  
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
        </div>
      </div>
    </div>
  );
} 