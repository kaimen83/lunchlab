import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UpdateStockAuditItemRequest } from '@/types/stock-audit';

/**
 * 재고 실사 항목 업데이트 API
 * 
 * @route PATCH /api/companies/[id]/stock/audits/[auditId]/items/[itemId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; auditId: string; itemId: string }> }
) {
  try {
    const { id: companyId, auditId, itemId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body: UpdateStockAuditItemRequest = await request.json();
    const { actual_quantity, notes } = body;

    // 입력값 검증
    if (actual_quantity === undefined || actual_quantity === null) {
      return NextResponse.json(
        { error: '실사량을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (actual_quantity < 0) {
      return NextResponse.json(
        { error: '실사량은 0 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 실사 항목 존재 확인 및 권한 검증
    const { data: auditItem, error: itemError } = await supabase
      .from('stock_audit_items')
      .select(`
        *,
        stock_audits!inner(company_id, status)
      `)
      .eq('id', itemId)
      .eq('audit_id', auditId)
      .single();

    if (itemError || !auditItem) {
      return NextResponse.json(
        { error: '실사 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 회사 ID 확인
    if ((auditItem.stock_audits as any).company_id !== companyId) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 실사가 완료된 경우 수정 불가
    if ((auditItem.stock_audits as any).status === 'completed') {
      return NextResponse.json(
        { error: '완료된 실사는 수정할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 실사 항목 업데이트
    const updateData: any = {
      actual_quantity,
      audited_by: userId,
      updated_at: new Date().toISOString()
    };

    // 메모가 제공된 경우 추가
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('stock_audit_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      console.error('실사 항목 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '실사 항목 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: updatedItem,
      message: '실사량이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('실사 항목 업데이트 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 재고 실사 항목 조회 API
 * 
 * @route GET /api/companies/[id]/stock/audits/[auditId]/items/[itemId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; auditId: string; itemId: string }> }
) {
  try {
    const { id: companyId, auditId, itemId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 사용자가 회사의 멤버인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: '이 회사에 접근할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 실사 항목 조회
    const { data: auditItem, error: itemError } = await supabase
      .from('stock_audit_items')
      .select(`
        *,
        stock_audits!inner(company_id, status, name)
      `)
      .eq('id', itemId)
      .eq('audit_id', auditId)
      .single();

    if (itemError || !auditItem) {
      return NextResponse.json(
        { error: '실사 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 회사 ID 확인
    if ((auditItem.stock_audits as any).company_id !== companyId) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      item: auditItem
    });

  } catch (error) {
    console.error('실사 항목 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 