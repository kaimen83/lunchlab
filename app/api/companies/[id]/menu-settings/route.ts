import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkUserCompanyAccess } from '@/lib/supabase-queries';
import { updateCompanyMenuSetting } from '@/lib/marketplace/queries';

// 회사 메뉴 설정을 업데이트하는 API
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' }, 
        { status: 401 }
      );
    }
    
    // params는 Promise이므로 await로 처리
    const { id: companyId } = await context.params;
    
    // 사용자의 회사 접근 권한 확인
    const { role, error: accessError } = await checkUserCompanyAccess(userId, companyId);
    
    if (accessError || !role) {
      return NextResponse.json(
        { error: '회사에 접근할 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 관리자 또는 소유자만 접근 가능
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: '메뉴 설정을 변경할 권한이 없습니다.' }, 
        { status: 403 }
      );
    }
    
    // 요청 데이터 파싱
    const data = await req.json();
    const { menuItemId, isVisible, displayOrder } = data;
    
    if (!menuItemId) {
      return NextResponse.json(
        { error: '메뉴 아이템 ID가 필요합니다.' }, 
        { status: 400 }
      );
    }
    
    // 메뉴 설정 업데이트
    const { menuSetting, error } = await updateCompanyMenuSetting(
      companyId,
      menuItemId,
      isVisible,
      displayOrder
    );
    
    if (error) {
      console.error('메뉴 설정 업데이트 오류:', error);
      return NextResponse.json(
        { error: '메뉴 설정을 저장하는 중 오류가 발생했습니다.' }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ menuSetting });
  } catch (error) {
    console.error('메뉴 설정 업데이트 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 