import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserRole } from '@/lib/clerk';

export async function POST(req: Request) {
  try {
    // 현재 로그인한 사용자 확인
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // 사용자 권한 확인 (최고관리자 또는 일반사용자만 허용)
    const userRole = await getUserRole(userId);
    if (userRole !== 'headAdmin' && userRole !== 'user') {
      return NextResponse.json({ error: '회사 페이지 생성 권한이 없습니다.' }, { status: 403 });
    }
    
    // 요청 바디에서 회사 정보 추출
    const body = await req.json();
    const { name, description } = body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: '회사 이름은 필수 입력 항목입니다.' }, { status: 400 });
    }
    
    // Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();
    
    // 회사 생성
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        description,
        created_by: userId
      })
      .select()
      .single();
    
    if (companyError) {
      console.error('회사 생성 오류:', companyError);
      return NextResponse.json({ error: '회사 페이지 생성에 실패했습니다.' }, { status: 500 });
    }
    
    // 회사 생성자를 소유자(owner) 권한으로 회사 멤버로 추가
    const { error: membershipError } = await supabase
      .from('company_memberships')
      .insert({
        company_id: company.id,
        user_id: userId,
        role: 'owner'
      });
    
    if (membershipError) {
      console.error('회사 멤버십 생성 오류:', membershipError);
      // 회사는 생성했지만 멤버십 생성에 실패한 경우 회사를 삭제
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json({ error: '회사 멤버십 생성에 실패했습니다.' }, { status: 500 });
    }
    
    // 기본 기능 설정 추가
    const defaultFeatures = [
      {
        company_id: company.id,
        feature_name: 'ingredients',
        is_enabled: true,
      },
      {
        company_id: company.id,
        feature_name: 'menus',
        is_enabled: true,
      },
      {
        company_id: company.id,
        feature_name: 'settings',
        is_enabled: true,
      },
      {
        company_id: company.id,
        feature_name: 'mealPlanning',
        is_enabled: true,
      }
    ];
    
    const { error: featuresError } = await supabase
      .from('company_features')
      .insert(defaultFeatures);
    
    if (featuresError) {
      console.error('기본 기능 설정 추가 오류:', featuresError);
      // 기능 추가 실패는 치명적 오류가 아니므로 경고만 출력하고 계속 진행
    }
    
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error('회사 생성 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 