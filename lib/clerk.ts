import { clerkClient } from '@clerk/nextjs/server';
import { UserRole } from './types';

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