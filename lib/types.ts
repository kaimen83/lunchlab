export type UserRole = 'headAdmin' | 'user' | 'tester';

export interface UserProfile {
  name: string;
  phoneNumber: string;
  affiliation: string;
}

export interface UserMetadata {
  role: UserRole;
  profileCompleted?: boolean;
  profile?: UserProfile;
}

// 회사 관련 타입 추가
export interface Company {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
}

// 회사 멤버 역할
export type CompanyMemberRole = 'owner' | 'admin' | 'member';

// 회사 멤버십
export interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  created_at: string;
  updated_at?: string;
}

// 회사 초대
export interface CompanyInvitation {
  id: string;
  company_id: string;
  invited_by: string;
  invited_user_id: string;
  role: CompanyMemberRole;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

// 회사 가입 신청
export interface CompanyJoinRequest {
  id: string;
  company_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at?: string;
} 