import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사의 용기 사이즈 목록 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id')
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
    
    // 회사의 메뉴 기능 활성화 상태 확인
    const { data: featureData, error: featureError } = await supabase
      .from('company_features')
      .select('is_enabled')
      .eq('company_id', companyId)
      .eq('feature_name', 'menus')
      .maybeSingle();
    
    if (featureError) {
      console.error('기능 확인 오류:', featureError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 기능이 비활성화된 경우
    if (!featureData || !featureData.is_enabled) {
      return NextResponse.json({ 
        error: '메뉴 관리 기능이 활성화되지 않았습니다. 관리자에게 문의하세요.' 
      }, { status: 403 });
    }
    
    // 용기 사이즈 목록 조회
    const { data: containerSizes, error: containerSizesError } = await supabase
      .from('container_sizes')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    
    if (containerSizesError) {
      console.error('용기 사이즈 조회 오류:', containerSizesError);
      return NextResponse.json({ error: '용기 사이즈 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(containerSizes || []);
  } catch (error) {
    console.error('용기 사이즈 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 용기 사이즈 추가
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, description } = body;
    
    // 필수 입력값 검증
    if (!name) {
      return NextResponse.json(
        { error: '용기 사이즈 이름은 필수 입력 항목입니다.' }, 
        { status: 400 }
      );
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
    
    // 이미 존재하는 용기 사이즈인지 확인
    const { data: existingContainer, error: existingError } = await supabase
      .from('container_sizes')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name)
      .maybeSingle();
    
    if (existingError) {
      console.error('용기 사이즈 중복 확인 오류:', existingError);
      return NextResponse.json({ error: '용기 사이즈 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (existingContainer) {
      return NextResponse.json({ error: '이미 동일한 이름의 용기 사이즈가 존재합니다.' }, { status: 400 });
    }
    
    // 용기 사이즈 추가
    const { data: containerSize, error: insertError } = await supabase
      .from('container_sizes')
      .insert({
        company_id: companyId,
        name,
        description
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('용기 사이즈 추가 오류:', insertError);
      return NextResponse.json({ error: '용기 사이즈 추가 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(containerSize);
  } catch (error) {
    console.error('용기 사이즈 추가 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 