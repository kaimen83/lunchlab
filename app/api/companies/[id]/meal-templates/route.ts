import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET: 템플릿 목록 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 템플릿 목록 조회 쿼리
    const { data, error } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('템플릿 목록 조회 오류:', error);
      return NextResponse.json(
        { error: '템플릿 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('템플릿 목록 가져오기 오류:', error);
    return NextResponse.json(
      { error: '템플릿 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 템플릿 추가
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 요청 본문에서 데이터 추출
    const { name } = await request.json();
    
    // 필수 필드 확인
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '템플릿 이름은 필수 항목입니다.' },
        { status: 400 }
      );
    }
    
    // 템플릿 중복 확인
    const { data: existingTemplate, error: checkError } = await supabase
      .from('meal_templates')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name.trim())
      .maybeSingle();
    
    if (checkError) {
      console.error('템플릿 중복 확인 오류:', checkError);
      return NextResponse.json(
        { error: '템플릿 중복 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (existingTemplate) {
      return NextResponse.json(
        { error: '이미 동일한 이름의 템플릿이 존재합니다.' },
        { status: 400 }
      );
    }
    
    // 새 템플릿 추가
    const { data, error } = await supabase
      .from('meal_templates')
      .insert({ 
        company_id: companyId,
        name: name.trim()
      })
      .select()
      .single();
    
    if (error) {
      console.error('템플릿 추가 오류:', error);
      return NextResponse.json(
        { error: '템플릿을 추가하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('템플릿 추가 오류:', error);
    return NextResponse.json(
      { error: '템플릿을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 