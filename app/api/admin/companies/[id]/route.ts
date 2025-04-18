import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isHeadAdmin } from '@/lib/clerk';
import { createClient } from '@/utils/supabase/server';

// 회사 정보 조회
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  // 현재 인증된 사용자 확인
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }
  
  // 관리자 권한 확인
  const isAdmin = await isHeadAdmin(userId);
  
  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  
  try {
    // params는 Promise이므로 await 사용
    const { id } = await params;
    
    // Supabase 클라이언트 생성
    const supabase = createClient();
    
    // 회사 정보 조회
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('회사 정보 조회 오류:', error);
      return NextResponse.json({ error: '회사 정보를 가져오는 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!company) {
      return NextResponse.json({ error: '존재하지 않는 회사입니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ company });
  } catch (error) {
    console.error('회사 조회 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 회사 정보 업데이트
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 현재 인증된 사용자 확인
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }
  
  // 관리자 권한 확인
  const isAdmin = await isHeadAdmin(userId);
  
  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  
  try {
    // params는 Promise이므로 await 사용
    const { id } = await params;
    const data = await req.json();
    
    // 요청 데이터 유효성 검사
    if (!data.name) {
      return NextResponse.json({ error: '회사명은 필수입니다.' }, { status: 400 });
    }
    
    // Supabase 클라이언트 생성
    const supabase = createClient();
    
    // 회사 정보 업데이트
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update({
        name: data.name,
        description: data.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('회사 정보 업데이트 오류:', error);
      return NextResponse.json({ error: '회사 정보를 업데이트하는 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error('회사 업데이트 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 회사 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 현재 인증된 사용자 확인
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  }
  
  // 관리자 권한 확인
  const isAdmin = await isHeadAdmin(userId);
  
  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  
  try {
    // params는 Promise이므로 await 사용
    const { id } = await params;
    
    // Supabase 클라이언트 생성
    const supabase = createClient();

    // 회사 존재 여부 확인
    const { data: companyExists, error: checkError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !companyExists) {
      return NextResponse.json({ error: '존재하지 않는 회사입니다.' }, { status: 404 });
    }

    // 연관된 데이터들을 순차적으로 삭제
    // 삭제 순서가 중요함 - 다른 테이블에서 참조하는 테이블은 나중에 삭제
    
    try {
      // 가능한 모든 관련 테이블 처리
      
      // 테이블 관련 삭제
      await supabase.from('meal_plans').delete().eq('company_id', id);
      await supabase.from('recipes').delete().eq('company_id', id);
      await supabase.from('menus').delete().eq('company_id', id);
      await supabase.from('ingredients').delete().eq('company_id', id);
      await supabase.from('suppliers').delete().eq('company_id', id);
      
      // 노트 및 피드백 삭제
      await supabase.from('notes').delete().eq('company_id', id);
      await supabase.from('feedbacks').delete().eq('company_id', id);
      
      // 파일 및 문서 삭제
      await supabase.from('documents').delete().eq('company_id', id);
      await supabase.from('files').delete().eq('company_id', id);
      
      // 알림 및 메시지 삭제
      await supabase.from('notifications').delete().eq('company_id', id);
      await supabase.from('messages').delete().eq('company_id', id);
      
      // 회사 관련 기본 데이터 삭제
      await supabase.from('company_memberships').delete().eq('company_id', id);
      await supabase.from('company_invitations').delete().eq('company_id', id);
      await supabase.from('company_join_requests').delete().eq('company_id', id);
      await supabase.from('company_features').delete().eq('company_id', id);
      
      // 회사 설정 삭제
      await supabase.from('company_settings').delete().eq('company_id', id);
      
      // 최종적으로 회사 삭제
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        throw deleteError;
      }
    } catch (error) {
      console.error('회사 삭제 과정 오류:', error);
      
      // 에러 메시지 추출
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      return NextResponse.json({ 
        error: '회사와 연관된 데이터를 삭제하는 중 오류가 발생했습니다.', 
        details: errorMessage
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '회사가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('회사 삭제 API 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 