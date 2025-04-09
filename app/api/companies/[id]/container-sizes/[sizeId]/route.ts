import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
    sizeId: string;
  }>;
}

// 특정 용기 사이즈 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, sizeId } = await context.params;
    
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
    
    // 용기 사이즈 조회
    const { data: containerSize, error: containerSizeError } = await supabase
      .from('container_sizes')
      .select('*')
      .eq('id', sizeId)
      .eq('company_id', companyId)
      .single();
    
    if (containerSizeError) {
      console.error('용기 사이즈 조회 오류:', containerSizeError);
      return NextResponse.json({ error: '용기 사이즈 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(containerSize);
  } catch (error) {
    console.error('용기 사이즈 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 용기 사이즈 수정
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, sizeId } = await context.params;
    
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
    
    // 수정하려는 용기 사이즈가 존재하는지 확인
    const { data: existingContainer, error: existingError } = await supabase
      .from('container_sizes')
      .select('*')
      .eq('id', sizeId)
      .eq('company_id', companyId)
      .single();
    
    if (existingError) {
      console.error('용기 사이즈 확인 오류:', existingError);
      return NextResponse.json({ error: '용기 사이즈를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 다른 용기 사이즈와 이름이 중복되는지 확인
    if (name !== existingContainer.name) {
      const { data: nameCheck, error: nameCheckError } = await supabase
        .from('container_sizes')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', name)
        .neq('id', sizeId)
        .maybeSingle();
      
      if (nameCheckError) {
        console.error('용기 사이즈 이름 중복 확인 오류:', nameCheckError);
        return NextResponse.json({ error: '용기 사이즈 확인 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      if (nameCheck) {
        return NextResponse.json({ error: '이미 동일한 이름의 용기 사이즈가 존재합니다.' }, { status: 400 });
      }
    }
    
    // 용기 사이즈 수정
    const { data: updatedContainer, error: updateError } = await supabase
      .from('container_sizes')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', sizeId)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('용기 사이즈 수정 오류:', updateError);
      return NextResponse.json({ error: '용기 사이즈 수정 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(updatedContainer);
  } catch (error) {
    console.error('용기 사이즈 수정 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 용기 사이즈 삭제
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId, sizeId } = await context.params;
    
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
    
    // 삭제하려는 용기 사이즈가 메뉴-용기 관계에서 사용 중인지 확인
    const { data: usageCheck, error: usageCheckError } = await supabase
      .from('menu_containers')
      .select('id')
      .eq('container_size_id', sizeId)
      .limit(1);
    
    if (usageCheckError) {
      console.error('용기 사이즈 사용 여부 확인 오류:', usageCheckError);
      return NextResponse.json({ error: '용기 사이즈 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (usageCheck && usageCheck.length > 0) {
      return NextResponse.json(
        { error: '이 용기 사이즈는 메뉴에서 사용 중이므로 삭제할 수 없습니다. 먼저 메뉴에서 이 용기를 제거해주세요.' },
        { status: 409 }
      );
    }
    
    // 용기 사이즈 삭제
    const { error: deleteError } = await supabase
      .from('container_sizes')
      .delete()
      .eq('id', sizeId)
      .eq('company_id', companyId);
    
    if (deleteError) {
      console.error('용기 사이즈 삭제 오류:', deleteError);
      return NextResponse.json({ error: '용기 사이즈 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '용기 사이즈가 삭제되었습니다.' });
  } catch (error) {
    console.error('용기 사이즈 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 