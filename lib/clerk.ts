import { clerkClient } from '@clerk/nextjs/server';
import { UserRole, UserProfile } from './types';

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata.role as UserRole || 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'user';
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    const client = await clerkClient();
    // 현재 사용자의 메타데이터 조회
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};
    
    // 기존 메타데이터를 유지하면서 역할만 업데이트
    await client.users.updateUser(userId, {
      publicMetadata: {
        ...currentMetadata,
        role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function isHeadAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'headAdmin';
}

export async function isUser(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'user';
}

export async function isTester(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'tester';
}

export async function getUserProfileStatus(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return !!user.publicMetadata.profileCompleted;
  } catch (error) {
    console.error('Error fetching user profile status:', error);
    return false;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    if (!user.publicMetadata.profileCompleted) {
      return null;
    }
    
    const profile = user.publicMetadata.profile as UserProfile;
    
    // 새로운 UserProfile 형식에 맞게 타입 확인
    if (profile && typeof profile === 'object' && 
        'name' in profile && 
        'phoneNumber' in profile && 
        'affiliation' in profile) {
      return profile;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      limit: 100,
    });
    
    // Clerk API 응답에서 사용자 데이터를 변환
    return usersResponse.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: (user.publicMetadata?.role as UserRole) || 'user',
      profileCompleted: !!user.publicMetadata?.profileCompleted,
      profile: user.publicMetadata?.profile as UserProfile,
      createdAt: user.createdAt
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
} 