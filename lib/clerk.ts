import { clerkClient } from '@clerk/nextjs/server';
import { UserRole, UserProfile } from './types';

// 사용자 역할 캐싱을 위한 Map
const roleCache = new Map<string, { role: UserRole, expires: number }>();
// 캐시 만료 시간 (5분)
const CACHE_TTL = 5 * 60 * 1000;

export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    // 캐시에서 역할 확인
    const cached = roleCache.get(userId);
    const now = Date.now();
    
    // 캐시가 유효한 경우
    if (cached && cached.expires > now) {
      return cached.role;
    }
    
    // 캐시가 없거나 만료된 경우 API 호출
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role as UserRole || 'user';
    
    // 결과를 캐시에 저장
    roleCache.set(userId, {
      role,
      expires: now + CACHE_TTL
    });
    
    return role;
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
    
    // 역할이 변경되었으므로 캐시 업데이트
    roleCache.set(userId, {
      role,
      expires: Date.now() + CACHE_TTL
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

// 사용자 프로필 캐싱을 위한 Map
const profileCache = new Map<string, { profile: UserProfile | null, expires: number }>();
const profileStatusCache = new Map<string, { completed: boolean, expires: number }>();

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
    // 캐시에서 상태 확인
    const cached = profileStatusCache.get(userId);
    const now = Date.now();
    
    // 캐시가 유효한 경우
    if (cached && cached.expires > now) {
      return cached.completed;
    }
    
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const completed = !!user.publicMetadata.profileCompleted;
    
    // 결과를 캐시에 저장
    profileStatusCache.set(userId, {
      completed,
      expires: now + CACHE_TTL
    });
    
    return completed;
  } catch (error) {
    console.error('Error fetching user profile status:', error);
    return false;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // 캐시에서 프로필 확인
    const cached = profileCache.get(userId);
    const now = Date.now();
    
    // 캐시가 유효한 경우
    if (cached && cached.expires > now) {
      return cached.profile;
    }
    
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    if (!user.publicMetadata.profileCompleted) {
      // 프로필이 없는 경우도 캐싱 (null로)
      profileCache.set(userId, {
        profile: null,
        expires: now + CACHE_TTL
      });
      return null;
    }
    
    const profile = user.publicMetadata.profile as UserProfile;
    
    // 새로운 UserProfile 형식에 맞게 타입 확인
    if (profile && typeof profile === 'object' && 
        'name' in profile && 
        'phoneNumber' in profile && 
        'affiliation' in profile) {
      // 유효한 프로필 캐싱
      profileCache.set(userId, {
        profile,
        expires: now + CACHE_TTL
      });
      return profile;
    }
    
    // 유효하지 않은 프로필도 캐싱 (null로)
    profileCache.set(userId, {
      profile: null,
      expires: now + CACHE_TTL
    });
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// 사용자 목록 캐싱
const usersCache: { users: any[] | null, expires: number } = { users: null, expires: 0 };

export async function getAllUsers() {
  try {
    // 캐시 확인
    const now = Date.now();
    if (usersCache.users && usersCache.expires > now) {
      return usersCache.users;
    }
    
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      limit: 100,
    });
    
    // Clerk API 응답에서 사용자 데이터를 변환
    const users = usersResponse.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: (user.publicMetadata?.role as UserRole) || 'user',
      profileCompleted: !!user.publicMetadata?.profileCompleted,
      profile: user.publicMetadata?.profile as UserProfile,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt
    }));
    
    // 결과 캐싱
    usersCache.users = users;
    usersCache.expires = now + CACHE_TTL;
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
} 