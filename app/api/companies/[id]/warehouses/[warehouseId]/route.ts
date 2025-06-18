import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// 창고 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; warehouseId: string }> }
) {
  try {
    const { id, warehouseId } = await params;
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

    // 해당 창고가 존재하고 해당 회사 소속인지 확인
    const { data: existingWarehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .eq('company_id', id)
      .single();

    if (warehouseError || !existingWarehouse) {
      return NextResponse.json({ error: '해당 창고를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 기본 창고로 설정하는 경우, 기존 기본 창고를 일반 창고로 변경
    if (is_default && !existingWarehouse.is_default) {
      await supabase
        .from('warehouses')
        .update({ is_default: false })
        .eq('company_id', id);
    }

    // 창고 정보 수정
    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        is_default: !!is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', warehouseId)
      .eq('company_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique constraint violation
        return NextResponse.json({ error: '동일한 이름의 창고가 이미 존재합니다.' }, { status: 409 });
      }
      return NextResponse.json({ error: '창고 수정에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error('창고 수정 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 창고 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; warehouseId: string }> }
) {
  try {
    const { id, warehouseId } = await params;
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

    // 해당 창고가 존재하고 해당 회사 소속인지 확인
    const { data: existingWarehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .eq('company_id', id)
      .single();

    if (warehouseError || !existingWarehouse) {
      return NextResponse.json({ error: '해당 창고를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 기본 창고인 경우 삭제 불가
    if (existingWarehouse.is_default) {
      return NextResponse.json({ error: '기본 창고는 삭제할 수 없습니다.' }, { status: 400 });
    }

    // 해당 창고에 재고가 있는지 확인
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select('id')
      .eq('warehouse_id', warehouseId)
      .limit(1);

    if (stockError) {
      return NextResponse.json({ error: '재고 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (stockItems && stockItems.length > 0) {
      return NextResponse.json({ 
        error: '해당 창고에 재고가 존재하여 삭제할 수 없습니다. 먼저 재고를 다른 창고로 이동하거나 제거해주세요.' 
      }, { status: 400 });
    }

    // 창고 삭제 (소프트 삭제)
    const { error } = await supabase
      .from('warehouses')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', warehouseId)
      .eq('company_id', id);

    if (error) {
      return NextResponse.json({ error: '창고 삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ message: '창고가 삭제되었습니다.' });
  } catch (error) {
    console.error('창고 삭제 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 