export type UserRole = 'admin' | 'employee' | 'viewer' | 'pending';

export interface UserMetadata {
  role: UserRole;
} 