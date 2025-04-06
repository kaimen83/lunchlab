import Link from 'next/link';
import { Building, Users, ArrowUpRight } from 'lucide-react';
import { Company } from '@/lib/types';

interface CompanyWithRole extends Company {
  role: string;
}

interface MyCompanyListProps {
  companies: CompanyWithRole[];
}

export function MyCompanyList({ companies }: MyCompanyListProps) {
  // 역할에 따른 배지 스타일
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // 역할을 한글로 표시
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      case 'member':
        return '멤버';
      default:
        return '알 수 없음';
    }
  };

  // 회사가 없는 경우 안내 메시지 표시
  if (companies.length === 0) {
    return (
      <div className="w-full max-w-md mt-8 p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">등록된 회사가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            새 회사를 생성하거나 초대를 받아 회사에 참여하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mt-8">
      <h2 className="text-xl font-semibold mb-4">내 회사 목록</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/companies/${company.id}`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex justify-between items-start">
              <div className="bg-blue-100 p-3 rounded-full">
                <Building className="h-6 w-6 text-blue-700" />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${getRoleBadgeStyle(company.role)}`}>
                {getRoleLabel(company.role)}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 truncate">{company.name}</h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {company.description || '설명이 없습니다.'}
            </p>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-1" />
                <span>멤버</span>
              </div>
              <div className="flex items-center text-sm text-blue-600 font-medium">
                <span>자세히 보기</span>
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 