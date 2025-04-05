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