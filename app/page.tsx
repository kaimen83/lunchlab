import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import { getUserRole, getUserProfileStatus } from "@/lib/clerk";
import { getUserCompanies } from "@/lib/supabase-queries";
import Link from "next/link";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { Building, Plus, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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

  // 역할에 따른 배지 스타일과 색상
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'yellow';
      case 'admin':
        return 'blue';
      case 'member':
      default:
        return 'green';
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

  // 아바타 배경색 및 아바타 색상
  const getAvatarColors = (companyName: string) => {
    const colors = [
      { bg: 'bg-blue-600', text: 'text-white' },
      { bg: 'bg-indigo-600', text: 'text-white' },
      { bg: 'bg-violet-600', text: 'text-white' },
      { bg: 'bg-purple-600', text: 'text-white' },
      { bg: 'bg-emerald-600', text: 'text-white' },
      { bg: 'bg-rose-600', text: 'text-white' },
      { bg: 'bg-amber-600', text: 'text-white' },
      { bg: 'bg-cyan-600', text: 'text-white' }
    ];
    
    // 회사 이름을 기반으로 일관된 색상 선택
    const hash = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <>
      {showProfileModal && <ProfileSetupModal />}
      
      <div className="container max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">내 회사</h1>
          <p className="text-muted-foreground">내가 속한 회사와 관리하는 회사 목록</p>
        </div>
        
        <div className="flex justify-end items-center gap-2 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/companies/search">
              <Search className="w-4 h-4 mr-2" />
              회사 검색
            </Link>
          </Button>
          
          {userCanCreateCompany && (
            <Button size="sm" asChild>
              <Link href="/companies/new">
                <Plus className="w-4 h-4 mr-2" />
                새 회사 생성
              </Link>
            </Button>
          )}
        </div>

        <Separator className="my-4" />
        
        {companies.length === 0 ? (
          <Card className="text-center bg-muted/30">
            <CardContent className="pt-10 pb-10">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl mb-2">아직 회사가 없습니다</CardTitle>
                <CardDescription className="mb-6 max-w-sm mx-auto">
                  새 회사를 생성하거나 기존 회사에 참여하세요.
                </CardDescription>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/companies/search">
                      <Search className="w-4 h-4 mr-2" />
                      회사 검색
                    </Link>
                  </Button>
                  
                  {userCanCreateCompany && (
                    <Button size="sm" asChild>
                      <Link href="/companies/new">
                        <Plus className="w-4 h-4 mr-2" />
                        새 회사 생성
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {companies.map((company) => {
              const avatarColors = getAvatarColors(company.name);
              return (
                <Link 
                  key={company.id} 
                  href={`/companies/${company.id}`}
                  className="block group"
                >
                  <Card className="group-hover:border-primary/50 transition-all duration-200 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center p-4">
                        <Avatar className="h-12 w-12 mr-4">
                          <AvatarFallback className={`${avatarColors.bg}`}>
                            {company.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {company.name}
                            </h3>
                            <Badge variant={getRoleBadgeVariant(company.role) as any}>
                              {getRoleLabel(company.role)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {company.description || '설명이 없습니다.'}
                          </p>
                        </div>
                        
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
