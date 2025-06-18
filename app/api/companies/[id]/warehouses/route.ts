import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 창고 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 창고 목록 조회
    const { data: warehouses, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('company_id', id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      return NextResponse.json({ error: '창고 목록을 가져오는데 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error('창고 목록 조회 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 창고 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, address, is_default } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '창고명은 필수입니다.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('*')
      .eq('company_id', id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    // 기본 창고로 설정하는 경우, 기존 기본 창고를 일반 창고로 변경
    if (is_default) {
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('company_id', id);
    }

    // 새 창고 생성
    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .insert({
        company_id: id,
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        is_default: !!is_default,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        return NextResponse.json({ error: '동일한 이름의 창고가 이미 존재합니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: '창고 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    console.error('창고 생성 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 