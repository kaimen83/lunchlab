'use client';

import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { UserRole, UserProfile } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import { Mail, Shield, LogOut, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ProfileSetupModal } from "./ProfileSetupModal";

export function Navbar() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  
  // companies 경로에서는 렌더링하지 않음
  const isCompaniesRoute = pathname?.startsWith('/companies');
  
  // 메타데이터 로드 함수
  const loadUserMetadata = useCallback(() => {
    if (isLoaded && user) {
      // 역할 설정
      const currentRole = user.publicMetadata.role as UserRole;
      setRole(currentRole || null);
      
      // 프로필 정보 설정
      if (user.publicMetadata.profileCompleted && user.publicMetadata.profile) {
        setUserProfile(user.publicMetadata.profile as UserProfile);
      }
    }
  }, [isLoaded, user]);

  // 초기 데이터 로드 및 사용자 변경 시 업데이트
  useEffect(() => {
    loadUserMetadata();
  }, [loadUserMetadata, isSignedIn]);
  
  // 라우팅 변경 시 메타데이터 다시 로드
  useEffect(() => {
    if (pathname === '/') {
      loadUserMetadata();
    }
  }, [pathname, loadUserMetadata]);

  // 모든 훅을 호출한 후에 조건부 반환
  if (isCompaniesRoute) {
    return null;
  }

  if (!isLoaded || !user) {
    return null;
  }

  // 사용자 이니셜 생성
  const getUserInitials = () => {
    if (userProfile?.name) {
      const nameParts = userProfile.name.split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return userProfile.name.substring(0, 2).toUpperCase();
    }
    
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress.substring(0, 2).toUpperCase();
    }
    
    return 'UN';
  };

  // 사용자 표시 이름
  const getDisplayName = () => {
    if (userProfile?.name) {
      return userProfile.name;
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.firstName) {
      return user.firstName;
    }
    
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      return user.emailAddresses[0].emailAddress.split('@')[0];
    }
    
    return '사용자';
  };

  // 로그아웃 처리
  const handleSignOut = async () => {
    await signOut(() => router.push('/sign-in'));
  };

  // 모달 닫기 시 DOM 클린업
  const cleanupDOM = () => {
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      
      try {
        document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
          try {
            if (el instanceof HTMLElement && !el.dataset.permanent && document.body.contains(el)) {
              el.removeAttribute('aria-hidden');
            }
          } catch (e) {
            // 오류 시 무시
          }
        });
        
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } catch (e) {
        console.warn("모달 닫기 정리 중 오류:", e);
      }
    }, 100);
  };

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-gray-800">
                  LunchLab
                </Link>
              </div>
              <nav className="ml-6 flex items-center space-x-4">
                {role === 'headAdmin' && (
                  <Link 
                    href="/admin" 
                    className="px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center"
                  >
                    <Shield className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">관리자</span>
                  </Link>
                )}
                
                <Link 
                  href="/invitations" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 flex items-center"
                >
                  <Mail className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">초대 관리</span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <Avatar className="h-8 w-8 rounded-full">
                        <AvatarImage src={user.imageUrl} alt={getDisplayName()} />
                        <AvatarFallback className="bg-blue-600 text-white">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium text-gray-800">{getDisplayName()}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayName()}</span>
                        <span className="text-xs text-muted-foreground">
                          {userProfile?.affiliation || user.emailAddresses[0]?.emailAddress}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowProfileModal(true)}>
                      <User className="mr-2 h-4 w-4" />
                      <span>내 프로필</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>로그아웃</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>
      {showProfileModal && (
        <ProfileSetupModal 
          onClose={() => {
            setShowProfileModal(false);
            cleanupDOM();
          }} 
        />
      )}
    </>
  );
} 