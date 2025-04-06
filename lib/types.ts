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