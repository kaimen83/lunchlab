import { clerkClient } from '@clerk/nextjs/server';
import { UserRole, UserProfile } from './types';

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata.role as UserRole || 'pending';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'pending';
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
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
    
    return usersResponse.data.map((user: any) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: user.publicMetadata.role as UserRole || 'pending',
      createdAt: user.createdAt
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
} 