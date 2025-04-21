import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'
import { isHeadAdmin } from '@/lib/clerk'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 요청자 인증 확인
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 권한 확인 (본인이거나 관리자만 접근 가능)
    const isAdmin = await isHeadAdmin(userId)
    const targetUserId = params.id

    // Clerk API를 통해 사용자 정보 조회
    const client = await clerkClient()
    const user = await client.users.getUser(targetUserId)

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 응답 데이터 구성
    const userData = {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : (user.firstName || user.username || user.emailAddresses[0]?.emailAddress),
      username: user.username,
      imageUrl: user.imageUrl,
    }

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error)
    return NextResponse.json({ 
      error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
} 