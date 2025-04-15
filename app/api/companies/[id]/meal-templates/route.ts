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
    const { name, container_selections = [] } = await request.json();
    
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
    
    // 용기 선택 정보가 제공된 경우 템플릿 선택 테이블에 저장
    if (container_selections && container_selections.length > 0) {
      // container_selections이 배열이 아니면 오류 반환
      if (!Array.isArray(container_selections)) {
        return NextResponse.json(
          { error: 'container_selections는 배열이어야 합니다.' },
          { status: 400 }
        );
      }
      
      try {
        // 먼저 회사의 첫 번째 메뉴를 찾아서 임시로 사용
        // menu_id가 필수 필드이므로 임시 메뉴 ID가 필요함
        const { data: firstMenu, error: menuError } = await supabase
          .from('menus')
          .select('id')
          .eq('company_id', companyId)
          .limit(1)
          .single();
        
        if (menuError || !firstMenu) {
          console.error('임시 메뉴 ID 조회 오류:', menuError);
          return NextResponse.json(data); // 템플릿은 생성했으니 성공으로 간주
        }
        
        // 각 용기 ID에 대해 템플릿 선택 저장 (임시 메뉴 ID 사용)
        const containerSelections = container_selections.map((containerId: string) => ({
          template_id: data.id,
          container_id: containerId,
          menu_id: firstMenu.id // 임시 메뉴 ID 사용
        }));
        
        if (containerSelections.length > 0) {
          const { error: selectionError } = await supabase
            .from('template_selections')
            .insert(containerSelections);
          
          if (selectionError) {
            console.error('템플릿 선택 저장 오류:', selectionError);
            // 템플릿 선택 저장 실패 시에도 템플릿은 이미 생성되었으므로 성공으로 간주
          }
        }
      } catch (selectionError) {
        console.error('템플릿 선택 저장 중 오류:', selectionError);
        // 템플릿 선택 저장 실패 시에도 템플릿은 이미 생성되었으므로 성공으로 간주
      }
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