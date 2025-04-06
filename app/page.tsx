import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { getUserRole, getUserProfileStatus } from "@/lib/clerk";
import { getUserCompanies } from "@/lib/supabase-queries";
import Link from "next/link";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { Building, Plus, ArrowRight } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }

  // 사용자 권한 및 프로필 완료 여부 확인
  const userRole = await getUserRole(userId);
  const userCanCreateCompany = userRole === 'headAdmin' || userRole === 'user';
  const profileCompleted = await getUserProfileStatus(userId);

  // 사용자의 회사 목록 조회
  const { companies, error } = await getUserCompanies(userId);
  
  // 오류가 있는 경우 콘솔에 로그
  if (error) {
    console.error('회사 목록 조회 중 오류:', error);
  }

  // 프로필이 완료되지 않은 경우에만 모달 표시
  const showProfileModal = !profileCompleted;

  // 역할에 따른 배지 스타일
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  // 역할 라벨
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

  return (
    <>
      {showProfileModal && <ProfileSetupModal />}
      
      <div className="flex flex-col items-center justify-center pt-20 pb-10 px-4">
        <h1 className="text-3xl font-bold mb-8">내 회사</h1>
        
        <div className="w-full max-w-xl">
          {/* 회사 생성 버튼 */}
          {userCanCreateCompany && (
            <div className="mb-6 flex justify-end">
              <Link 
                href="/companies/new" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 회사 생성
              </Link>
            </div>
          )}
          
          {/* 내 회사 목록 - Slack 스타일 */}
          {companies.length === 0 ? (
            <div className="bg-white shadow-lg rounded-lg p-8 text-center">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">아직 회사가 없습니다</h3>
              <p className="text-gray-500 mb-4">
                새 회사를 생성하거나 초대를 받아 회사에 참여하세요.
              </p>
              {userCanCreateCompany && (
                <Link 
                  href="/companies/new" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  새 회사 생성
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {companies.map((company) => (
                <Link 
                  key={company.id} 
                  href={`/companies/${company.id}`}
                  className="bg-white hover:bg-gray-50 shadow-md rounded-lg p-4 transition-all duration-200 border border-gray-200"
                >
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-lg mr-4 flex-shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {company.name}
                        </h3>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(company.role)}`}>
                          {getRoleLabel(company.role)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                        {company.description || '설명이 없습니다.'}
                      </p>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-gray-400 ml-4 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
