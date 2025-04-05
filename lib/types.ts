export type UserRole = 'admin' | 'employee' | 'viewer' | 'pending';

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