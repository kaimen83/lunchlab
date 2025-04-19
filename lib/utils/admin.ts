import { UserRole } from '@/lib/types';

// 포인터 이벤트 스타일 제거 유틸리티
export const removePointerEventsFromBody = () => {
  if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = '';
  }
};

// 날짜 포맷 유틸리티
export const formatDate = (dateString?: string) => {
  if (!dateString) return '정보 없음';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// 역할 이름 반환 유틸리티
export const getRoleName = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    headAdmin: '최고 관리자',
    user: '일반사용자',
    tester: '테스터'
  };
  return roleMap[role] || '일반사용자';
};

// 역할 배지 스타일 지정 유틸리티
export const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
  const variantMap: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
    headAdmin: "destructive",
    user: "default",
    tester: "secondary"
  };
  return variantMap[role] || "default";
};

// 사용자 표시 이름 유틸리티
export const getUserDisplayName = (user: any): string => {
  if (user.profileCompleted && user.profile?.name) {
    return user.profile.name;
  }
  
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }
  
  return user.email?.split('@')[0] || '이름 없음';
};

// 사용자 이니셜 유틸리티
export const getInitials = (user: any): string => {
  const name = getUserDisplayName(user);
  return name.substring(0, 2).toUpperCase();
}; 