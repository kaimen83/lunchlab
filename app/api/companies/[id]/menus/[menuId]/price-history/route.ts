import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';

// 라우트 핸들러 컨텍스트에 대한 타입 정의
interface RouteContext {
  params: Promise<{
    id: string;
    menuId: string;
  }>;
}

// 가격 이력 조회 API
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, menuId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError) {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 메뉴 가격 이력 조회
    const { data: priceHistory, error: historyError } = await supabase
      .from('menu_price_history')
      .select('*')
      .eq('menu_id', menuId)
      .order('created_at', { ascending: false });
    
    if (historyError) {
      console.error('가격 이력 조회 오류:', historyError);
      return NextResponse.json({ error: '가격 이력 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(priceHistory || []);
  } catch (error) {
    console.error('가격 이력 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 