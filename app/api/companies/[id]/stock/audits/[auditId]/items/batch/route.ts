import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * 실사 항목 일괄 업데이트 API
 * 
 * @route PATCH /api/companies/[id]/stock/audits/[auditId]/items/batch
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  try {
    const { id: companyId, auditId } = await params;
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

    // 실사가 해당 회사의 것인지 확인
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .select('id, status, company_id')
      .eq('id', auditId)
      .eq('company_id', companyId)
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: '실사를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (audit.status !== 'in_progress') {
      return NextResponse.json(
        { error: '진행 중인 실사만 수정할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { updates } = body; // { itemId: { actual_quantity?, notes? } }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: '업데이트할 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 각 항목을 순차적으로 업데이트
    const updatePromises = Object.entries(updates).map(async ([itemId, updateData]: [string, any]) => {
      // 먼저 현재 항목 정보를 조회하여 장부량을 가져옴
      const { data: currentItem, error: itemError } = await supabase
        .from('stock_audit_items')
        .select('book_quantity')
        .eq('id', itemId)
        .eq('audit_id', auditId)
        .single();

      if (itemError) {
        console.error('항목 조회 오류:', itemError);
        return { error: itemError };
      }

      const updateFields: any = {};
      
      if (updateData.actual_quantity !== undefined) {
        const actualQuantity = Number(updateData.actual_quantity);
        const bookQuantity = currentItem.book_quantity;
        const difference = actualQuantity - bookQuantity;
        
        updateFields.actual_quantity = actualQuantity;
        updateFields.audited_by = userId;
        updateFields.audited_at = new Date().toISOString();
        
        // 상태 자동 설정: 차이가 있으면 'discrepancy', 없으면 'completed'
        updateFields.status = difference !== 0 ? 'discrepancy' : 'completed';
      }
      
      if (updateData.notes !== undefined) {
        updateFields.notes = updateData.notes;
      }

      return supabase
        .from('stock_audit_items')
        .update(updateFields)
        .eq('id', itemId)
        .eq('audit_id', auditId);
    });

    const results = await Promise.all(updatePromises);
    
    // 에러 체크
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('일괄 업데이트 오류:', errors);
      return NextResponse.json(
        { 
          error: '일부 항목 업데이트에 실패했습니다.',
          details: errors.map(e => e.error?.message).join(', ')
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '성공적으로 업데이트되었습니다.',
      updated_count: Object.keys(updates).length
    });

  } catch (error) {
    console.error('일괄 업데이트 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 