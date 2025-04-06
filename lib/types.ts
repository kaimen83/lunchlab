export type UserRole = 'headAdmin' | 'companyAdmin' | 'worker' | 'pending' | 'tester';

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