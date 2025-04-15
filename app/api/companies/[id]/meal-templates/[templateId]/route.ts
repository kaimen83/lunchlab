import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    templateId: string;
  }>;
}

// 특정 템플릿 조회
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, templateId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 템플릿 정보 조회
    const { data: template, error } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .single();
    
    if (error) {
      console.error('템플릿 조회 오류:', error);
      return NextResponse.json(
        { error: '템플릿 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (!template) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 템플릿에 연결된 메뉴와 용기 선택 정보 조회
    const { data: templateSelections, error: selectionsError } = await supabase
      .from('template_selections')
      .select('*')
      .eq('template_id', templateId);
    
    if (selectionsError) {
      console.error('템플릿 선택 정보 조회 오류:', selectionsError);
      // 선택 정보가 없어도 템플릿 자체는 반환
      return NextResponse.json({ ...template, template_selections: [] });
    }
    
    // 템플릿과 연결된 선택 정보 함께 반환
    return NextResponse.json({
      ...template,
      template_selections: templateSelections || []
    });
  } catch (error) {
    console.error('템플릿 조회 오류:', error);
    return NextResponse.json(
      { error: '템플릿 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 템플릿 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, templateId } = await context.params;
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
    
    // 템플릿 중복 확인 (동일 회사 내 다른 템플릿과 이름이 중복되지 않아야 함)
    const { data: existingTemplate, error: checkError } = await supabase
      .from('meal_templates')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', name.trim())
      .neq('id', templateId)
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
    
    // 템플릿 수정
    const { data, error } = await supabase
      .from('meal_templates')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (error) {
      console.error('템플릿 수정 오류:', error);
      return NextResponse.json(
        { error: '템플릿을 수정하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('템플릿 수정 오류:', error);
    return NextResponse.json(
      { error: '템플릿을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 템플릿 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // params는 Promise이므로 await 사용
    const { id: companyId, templateId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // 템플릿 삭제
    const { error } = await supabase
      .from('meal_templates')
      .delete()
      .eq('id', templateId)
      .eq('company_id', companyId);
    
    if (error) {
      console.error('템플릿 삭제 오류:', error);
      return NextResponse.json(
        { error: '템플릿을 삭제하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('템플릿 삭제 오류:', error);
    return NextResponse.json(
      { error: '템플릿을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 