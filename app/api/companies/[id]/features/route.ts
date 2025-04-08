import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사 기능 목록 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 관리자급 이상인지 확인
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
    
    if (!membershipData || !['owner', 'admin'].includes(membershipData.role)) {
      return NextResponse.json({ error: '해당 회사의 기능을 관리할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사의 기능 목록 조회
    const { data: features, error: featuresError } = await supabase
      .from('company_features')
      .select('*')
      .eq('company_id', companyId);
    
    if (featuresError) {
      console.error('회사 기능 조회 오류:', featuresError);
      return NextResponse.json({ error: '회사 기능 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(features || []);
  } catch (error) {
    console.error('회사 기능 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 회사 기능 토글(활성화/비활성화)
export async function POST(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { featureName, isEnabled, config } = body;
    
    if (!featureName || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: '기능 이름과 활성화 상태는 필수 입력 항목입니다.' }, 
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 관리자급 이상인지 확인
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
    
    if (!membershipData || !['owner', 'admin'].includes(membershipData.role)) {
      return NextResponse.json({ error: '해당 회사의 기능을 관리할 권한이 없습니다.' }, { status: 403 });
    }
    
    // 기존 기능 설정 확인
    const { data: existingFeature, error: featureCheckError } = await supabase
      .from('company_features')
      .select('id')
      .eq('company_id', companyId)
      .eq('feature_name', featureName)
      .maybeSingle();
    
    if (featureCheckError) {
      console.error('기능 확인 오류:', featureCheckError);
      return NextResponse.json({ error: '기능 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    let result;
    
    if (existingFeature) {
      // 기존 기능 업데이트
      const { data, error } = await supabase
        .from('company_features')
        .update({ 
          is_enabled: isEnabled,
          config: config || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFeature.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // 새 기능 추가
      const { data, error } = await supabase
        .from('company_features')
        .insert({
          company_id: companyId,
          feature_name: featureName,
          is_enabled: isEnabled,
          config: config || null
        })
        .select()
        .single();
      
      result = { data, error };
    }
    
    if (result.error) {
      console.error('기능 저장 오류:', result.error);
      return NextResponse.json({ error: '기능 설정 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('회사 기능 설정 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 