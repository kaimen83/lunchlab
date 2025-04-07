import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const key = searchParams.get('key');
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    let query = supabase
      .from('module_settings')
      .select('*')
      .eq('company_id', companyId)
      .eq('module_id', params.moduleId);
    
    if (key) {
      query = query.eq('key', key);
    }
    
    const { data: settings, error } = await query;
    
    if (error) {
      console.error('설정 조회 오류:', error);
      return NextResponse.json(
        { error: '설정 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    if (key) {
      // 단일 설정 조회인 경우
      return NextResponse.json(settings?.length > 0 ? settings[0] : null);
    }
    
    // 모든 설정 조회인 경우
    return NextResponse.json(settings);
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json(
      { error: '설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const { companyId, key, value } = await request.json();
    
    if (!companyId || !key) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // 이미 존재하는 설정인지 확인
    const { data: existingSetting } = await supabase
      .from('module_settings')
      .select('id')
      .eq('company_id', companyId)
      .eq('module_id', params.moduleId)
      .eq('key', key)
      .single();
    
    if (existingSetting) {
      // 기존 설정 업데이트
      const { error: updateError } = await supabase
        .from('module_settings')
        .update({
          value: value !== undefined ? JSON.stringify(value) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSetting.id);
      
      if (updateError) {
        console.error('설정 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: '설정 업데이트 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    } else {
      // 새 설정 생성
      const { error: insertError } = await supabase
        .from('module_settings')
        .insert({
          company_id: companyId,
          module_id: params.moduleId,
          key,
          value: value !== undefined ? JSON.stringify(value) : null,
        });
      
      if (insertError) {
        console.error('설정 생성 오류:', insertError);
        return NextResponse.json(
          { error: '설정 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }
    
    // 설정 변경 이벤트 발행 (추후 구현)
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('설정 저장 오류:', error);
    return NextResponse.json(
      { error: '설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const key = searchParams.get('key');
    
    if (!companyId || !key) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    const { error } = await supabase
      .from('module_settings')
      .delete()
      .eq('company_id', companyId)
      .eq('module_id', params.moduleId)
      .eq('key', key);
    
    if (error) {
      console.error('설정 삭제 오류:', error);
      return NextResponse.json(
        { error: '설정 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('설정 삭제 오류:', error);
    return NextResponse.json(
      { error: '설정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 