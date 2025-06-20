import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { StockAuditDetailResponse, StockAuditStats } from '@/types/stock-audit';

/**
 * 재고 실사 상세 정보 조회 API
 * 
 * @route GET /api/companies/[id]/stock/audits/[auditId]
 */
export async function GET(
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

    // 실사 세션 정보 조회
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .select('*')
      .eq('id', auditId)
      .eq('company_id', companyId)
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: '실사 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 창고 정보 조회
    let warehouse = null;
    if (audit.warehouse_id) {
      const { data: warehouseData, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('id', audit.warehouse_id)
        .single();

      if (warehouseError) {
        console.error('창고 정보 조회 오류:', warehouseError);
        // 창고 정보 조회 실패는 치명적 오류가 아니므로 계속 진행
      } else {
        warehouse = warehouseData;
      }
    }

    // 쿼리 파라미터 처리
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const itemType = searchParams.get('itemType');
    const search = searchParams.get('search');

    // 실사 항목 조회 (가나다 순 정렬)
    let itemsQuery = supabase
      .from('stock_audit_items')
      .select(`
        *,
        stock_items!inner(
          item_type,
          item_id
        )
      `, { count: 'exact' })
      .eq('audit_id', auditId);

    // 필터 적용
    if (itemType && itemType !== 'all') {
      itemsQuery = itemsQuery.eq('item_type', itemType);
    }

    // 검색 필터 적용 (item_code가 있으면 데이터베이스 레벨에서 빠른 검색 가능)
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      itemsQuery = itemsQuery.or(`item_name.ilike.%${searchTerm}%,item_code.ilike.%${searchTerm}%`);
    }

    // 가나다 순 정렬 적용
    itemsQuery = itemsQuery.order('item_name', { ascending: true });

    // 페이지네이션 적용 (데이터베이스 레벨에서 처리)
    const dbStartIndex = (page - 1) * pageSize;
    itemsQuery = itemsQuery.range(dbStartIndex, dbStartIndex + pageSize - 1);

    const { data: auditItems, error: itemsError, count } = await itemsQuery;

    if (itemsError) {
      console.error('실사 항목 조회 오류:', itemsError);
      return NextResponse.json(
        { error: '실사 항목을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 실사 항목에 코드와 등급 정보 추가
    const enrichedItems = await Promise.all(
      (auditItems || []).map(async (item) => {
        const stockItem = item.stock_items;
        let codeName = null;
        let stockGrade = null;
        
        if (stockItem && stockItem.item_type && stockItem.item_id) {
          // 식자재인 경우 ingredients 테이블에서 코드와 등급 조회
          if (stockItem.item_type === 'ingredient') {
            const { data: ingredientData } = await supabase
              .from('ingredients')
              .select('code_name, stock_grade')
              .eq('id', stockItem.item_id)
              .single();
            
            if (ingredientData) {
              codeName = ingredientData.code_name;
              stockGrade = ingredientData.stock_grade;
            }
          }
          // 용기인 경우 containers 테이블에서 코드 조회
          else if (stockItem.item_type === 'container') {
            const { data: containerData } = await supabase
              .from('containers')
              .select('code_name')
              .eq('id', stockItem.item_id)
              .single();
            
            if (containerData) {
              codeName = containerData.code_name;
              // 용기는 등급이 없으므로 stockGrade는 null 유지
            }
          }
        }

        // stock_items 정보 제거하고 코드/등급 정보 추가
        const { stock_items, ...itemWithoutStockItems } = item;
        return {
          ...itemWithoutStockItems,
          code_name: codeName,
          stock_grade: stockGrade
        };
      })
    );

    // 데이터베이스에서 이미 필터링과 페이지네이션이 적용되었으므로 enrichedItems를 그대로 사용
    const paginatedItems = enrichedItems;

    // 통계 정보 조회
    const { data: statsData, error: statsError } = await supabase
      .from('stock_audit_items')
      .select('status')
      .eq('audit_id', auditId);

    if (statsError) {
      console.error('통계 조회 오류:', statsError);
      return NextResponse.json(
        { error: '통계 정보를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // 통계 계산
    const totalItems = statsData?.length || 0;
    const completedItems = statsData?.filter(item => item.status === 'completed').length || 0;
    const discrepancyItems = statsData?.filter(item => item.status === 'discrepancy').length || 0;
    const pendingItems = statsData?.filter(item => item.status === 'pending').length || 0;

    const stats: StockAuditStats = {
      total_items: totalItems,
      completed_items: completedItems,
      pending_items: pendingItems,
      discrepancy_items: discrepancyItems,
      completion_rate: totalItems > 0 ? Math.round(((completedItems + discrepancyItems) / totalItems) * 100) : 0
    };

    const response: StockAuditDetailResponse = {
      audit,
      items: paginatedItems || [],
      stats,
      warehouse: warehouse || undefined,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('실사 상세 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 재고 실사 완료 처리 API
 * 
 * @route PATCH /api/companies/[id]/stock/audits/[auditId]
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

    // 요청 본문 파싱
    const body = await request.json();
    const { action, apply_differences = false } = body;

    if (action !== 'complete' && action !== 'apply_differences') {
      return NextResponse.json(
        { error: '지원하지 않는 액션입니다.' },
        { status: 400 }
      );
    }

    // 실사 세션 존재 확인
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .select('*')
      .eq('id', auditId)
      .eq('company_id', companyId)
      .single();

    if (auditError || !audit) {
      return NextResponse.json(
        { error: '실사 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 실사 완료 액션의 경우 이미 완료된 실사인지 확인
    if (action === 'complete' && audit.status === 'completed') {
      return NextResponse.json(
        { error: '이미 완료된 실사입니다.' },
        { status: 400 }
      );
    }

    // 재고량 반영 액션의 경우 완료된 실사인지 확인
    if (action === 'apply_differences' && audit.status !== 'completed') {
      return NextResponse.json(
        { error: '완료된 실사만 재고량을 반영할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 실사량이 입력된 모든 항목들 조회 (실제 재고량 반영을 위해)
    if (apply_differences || action === 'apply_differences') {
      const { data: auditedItems, error: auditedError } = await supabase
        .from('stock_audit_items')
        .select('stock_item_id, actual_quantity, difference, status, item_name')
        .eq('audit_id', auditId)
        .in('status', ['completed', 'discrepancy'])
        .not('actual_quantity', 'is', null);

      if (auditedError) {
        console.error('실사 항목 조회 오류:', auditedError);
        return NextResponse.json(
          { error: '실사 항목을 조회하는데 실패했습니다.' },
          { status: 500 }
        );
      }

      // 실제 재고량을 stock_items 테이블에 반영
      if (auditedItems && auditedItems.length > 0) {
        console.log(`재고 반영 시작: ${auditedItems.length}개 항목 처리`);
        
        let updatedCount = 0;
        const errors: string[] = [];
        
        for (const item of auditedItems) {
          try {
            console.log(`재고 반영 중: ${item.item_name} (${item.stock_item_id}) - ${item.actual_quantity}`);
            
            // 먼저 현재 재고 정보 확인
            const { data: currentStock, error: selectError } = await supabase
              .from('stock_items')
              .select('id, current_quantity, company_id')
              .eq('id', item.stock_item_id)
              .single();
            
            if (selectError) {
              console.error(`재고 조회 오류 (${item.item_name}):`, selectError);
              errors.push(`${item.item_name}: 재고 조회 실패 - ${selectError.message}`);
              continue;
            }
            
            console.log(`현재 재고 확인: ${item.item_name} - 기존: ${currentStock.current_quantity}, 신규: ${item.actual_quantity}`);
            
            // 재고량 업데이트
            const { data: updateResult, error: updateError } = await supabase
              .from('stock_items')
              .update({ 
                current_quantity: Number(item.actual_quantity),
                last_updated: new Date().toISOString()
              })
              .eq('id', item.stock_item_id)
              .eq('company_id', companyId) // 추가 보안을 위해 company_id도 확인
              .select('id, current_quantity');

            if (updateError) {
              console.error(`재고량 업데이트 오류 (${item.item_name}):`, updateError);
              errors.push(`${item.item_name}: ${updateError.message}`);
            } else if (updateResult && updateResult.length > 0) {
              console.log(`재고량 업데이트 성공: ${item.item_name} -> ${updateResult[0].current_quantity}`);
              updatedCount++;
              
              // 재고 거래 기록 생성 (실사 조정) - 실사 날짜를 거래 날짜로 사용
              const { error: transactionError } = await supabase
                .from('stock_transactions')
                .insert({
                  stock_item_id: item.stock_item_id,
                  transaction_type: 'adjustment',
                  quantity: Number(item.difference) || 0,
                  transaction_date: audit.audit_date, // 실사 날짜를 거래 날짜로 사용
                  user_id: userId,
                  reference_id: auditId,
                  reference_type: 'stock_audit',
                  notes: `실사 조정: ${item.item_name} (실사량: ${item.actual_quantity})`
                });
              
              if (transactionError) {
                console.error(`거래 기록 생성 오류 (${item.item_name}):`, transactionError);
                // 거래 기록 실패는 치명적이지 않으므로 계속 진행
              }
            } else {
              console.error(`재고량 업데이트 실패: ${item.item_name} - 결과 없음`);
              errors.push(`${item.item_name}: 업데이트 결과 없음`);
            }
          } catch (error) {
            console.error(`재고 반영 중 예외 발생 (${item.item_name}):`, error);
            errors.push(`${item.item_name}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          }
        }
        
        console.log(`재고 반영 완료: ${updatedCount}/${auditedItems.length}개 성공`);
        
        if (errors.length > 0) {
          console.error('재고 반영 중 발생한 오류들:', errors);
          // 일부 실패가 있어도 성공한 것이 있으면 계속 진행
          if (updatedCount === 0) {
            return NextResponse.json(
              { 
                error: '재고량 반영에 실패했습니다.',
                details: errors.join('; ')
              },
              { status: 500 }
            );
          }
        }
      }
    }

    // 실사 세션 완료 처리 (완료 액션인 경우에만)
    let updatedAudit = audit;
    if (action === 'complete') {
      const { data: completedAudit, error: updateError } = await supabase
        .from('stock_audits')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', auditId)
        .select()
        .single();

      if (updateError) {
        console.error('실사 완료 처리 오류:', updateError);
        return NextResponse.json(
          { error: '실사 완료 처리에 실패했습니다.' },
          { status: 500 }
        );
      }
      
      updatedAudit = completedAudit;
    }

    // 반영된 항목 수 계산
    let appliedCount = 0;
    if (apply_differences || action === 'apply_differences') {
      const { data: auditedItems } = await supabase
        .from('stock_audit_items')
        .select('id')
        .eq('audit_id', auditId)
        .in('status', ['completed', 'discrepancy'])
        .not('actual_quantity', 'is', null);
      
      appliedCount = auditedItems?.length || 0;
    }

    return NextResponse.json({
      audit: updatedAudit,
      applied_differences: apply_differences || action === 'apply_differences',
      applied_count: appliedCount,
      action: action
    });

  } catch (error) {
    console.error('실사 완료 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 