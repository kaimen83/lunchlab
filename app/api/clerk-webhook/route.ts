import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  // Clerk 웹훅 서명 검증
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET이 설정되지 않았습니다.');
    return new NextResponse('Webhook 시크릿이 없습니다', { status: 400 });
  }

  // 요청 헤더에서 svix 서명 가져오기
  const headersList = await headers();
  const svix_id = headersList.get('svix-id') || '';
  const svix_timestamp = headersList.get('svix-timestamp') || '';
  const svix_signature = headersList.get('svix-signature') || '';

  // 필요한 헤더가 없는 경우 처리
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('svix 헤더가 누락되었습니다', { status: 400 });
  }

  // 요청 바디 가져오기
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // svix 서명 헤더 객체 생성
  const svixHeaders = {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature,
  };

  // 웹훅 서명 검증
  let evt: any;
  try {
    const webhook = new Webhook(WEBHOOK_SECRET);
    evt = webhook.verify(body, svixHeaders);
  } catch (err) {
    console.error('웹훅 검증 실패:', err);
    return new NextResponse('웹훅 검증 실패', { status: 400 });
  }

  // 이벤트 유형 확인
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id } = evt.data;

    try {
      // 새 사용자에게 '가입대기' 역할 부여
      const client = await clerkClient();
      
      // 기존 메타데이터 조회 (새 사용자지만 다른 서비스에서 메타데이터가 설정되었을 수 있음)
      const user = await client.users.getUser(id);
      const currentMetadata = user.publicMetadata || {};
      
      await client.users.updateUser(id, {
        publicMetadata: {
          ...currentMetadata,
          role: 'pending'
        }
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('사용자 메타데이터 업데이트 실패:', error);
      return new NextResponse('사용자 업데이트 실패', { status: 500 });
    }
  }

  // 다른 이벤트는 무시
  return NextResponse.json({ success: true });
} 