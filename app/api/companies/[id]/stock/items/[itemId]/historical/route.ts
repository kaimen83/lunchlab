import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 조합된 ID를 파싱하여 item_type과 item_id를 분리
 * @param combinedId - 'ingredient_xxx' 또는 'container_xxx' 형태의 ID
 * @returns {itemType: string, actualItemId: string} | null
 */
function parseItemId(combinedId: string): { itemType: string; actualItemId: string } | null {
  if (combinedId.startsWith('ingredient_')) {
    return {
      itemType: 'ingredient',
      actualItemId: combinedId.replace('ingredient_', '')
    };
  } else if (combinedId.startsWith('container_')) {
    return {
      itemType: 'container',
      actualItemId: combinedId.replace('container_', '')
    };
  }
  
  // 기존 UUID 형태도 지원 (하위 호환성)
  return null;
}

/**
 * 특정 날짜의 재고 현황 조회 API
 * 
 * 최적화 전략:
 * 1. 스냅샷 우선 조회 (O(1))
 * 2. 스냅샷이 없으면 가장 가까운 과거 스냅샷 + 이후 거래 계산 (O(k))
 * 3. 스냅샷이 전혀 없으면 전체 거래 계산 (O(n))
 * 
 * 창고별 조회 지원:
 * - warehouseId 파라미터가 있으면 해당 창고의 재고만 조회
 * - warehouseId가 없으면 모든 창고의 해당 아이템 재고를 합산
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    const warehouseId = searchParams.get('warehouseId'); // 창고 ID (선택사항)
    
    if (!targetDate) {
      return NextResponse.json(
        { error: 'date 파라미터가 필요합니다. (YYYY-MM-DD 형식)' },
        { status: 400 }
      );
    }
    
    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return NextResponse.json(
        { error: '날짜는 YYYY-MM-DD 형식이어야 합니다.' },
        { status: 400 }
      );
    }
    
    // Next.js 15에서 params는 Promise이므로 await 필요
    const { id: companyId, itemId } = await params;
    
    console.log(`🔍 재고 조회 시작: ${itemId} @ ${targetDate} (창고: ${warehouseId || '전체'})`);
    
    // 조합된 ID 파싱
    const parsedItem = parseItemId(itemId);
    let itemType: string;
    let actualItemId: string;
    
    if (parsedItem) {
      itemType = parsedItem.itemType;
      actualItemId = parsedItem.actualItemId;
      console.log(`📝 조합된 ID 파싱: ${itemType} - ${actualItemId}`);
    } else {
      // 기존 UUID 형태 처리 (하위 호환성)
      // 실제 stock_items에서 해당 ID를 찾아서 item_type과 item_id 확인
      const { data: stockItem, error: stockItemError } = await supabase
        .from('stock_items')
        .select('item_type, item_id')
        .eq('id', itemId)
        .eq('company_id', companyId)
        .single();
      
      if (stockItemError || !stockItem) {
        return NextResponse.json(
          { error: '유효하지 않은 재고 항목 ID입니다.' },
          { status: 404 }
        );
      }
      
      itemType = stockItem.item_type;
      actualItemId = stockItem.item_id;
      console.log(`📝 기존 UUID 처리: ${itemType} - ${actualItemId}`);
    }

    // 해당 아이템의 모든 stock_items 조회 (창고별 구분)
    let stockItemsQuery = supabase
      .from('stock_items')
      .select(`
        id,
        warehouse_id,
        current_quantity,
        warehouses(name)
      `)
      .eq('company_id', companyId)
      .eq('item_type', itemType)
      .eq('item_id', actualItemId);

    // 특정 창고가 지정된 경우 필터링
    if (warehouseId) {
      stockItemsQuery = stockItemsQuery.eq('warehouse_id', warehouseId);
    }

    const { data: stockItems, error: stockItemsError } = await stockItemsQuery;
    
    if (stockItemsError) {
      console.error('재고 항목 조회 오류:', stockItemsError);
      return NextResponse.json(
        { error: '재고 항목 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!stockItems || stockItems.length === 0) {
      return NextResponse.json(
        { error: '해당 아이템의 재고 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 아이템 기본 정보 조회
    let itemInfo;
    
    if (itemType === 'ingredient') {
      const { data, error } = await supabase
        .from('ingredients')
        .select('name, unit')
        .eq('id', actualItemId)
        .eq('company_id', companyId)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: '식재료 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      itemInfo = data;
    } else {
      // containers 테이블에는 unit 컬럼이 없음
      const { data, error } = await supabase
        .from('containers')
        .select('name')
        .eq('id', actualItemId)
        .eq('company_id', companyId)
        .single();
      
      if (error || !data) {
        return NextResponse.json(
          { error: '용기 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // containers는 기본적으로 'ea' 단위 사용
      itemInfo = {
        name: data.name,
        unit: 'ea'
      };
    }

    // 각 창고별로 재고 계산
    const warehouseResults = [];
    let totalQuantity = 0;
    const startTime = Date.now();

    for (const stockItem of stockItems) {
      const stockItemId = stockItem.id;
      const warehouseName = (stockItem.warehouses as any)?.name || '알 수 없는 창고';
      
      console.log(`🏢 창고별 계산: ${warehouseName} (${stockItemId})`);

      // 1단계: 해당 날짜의 스냅샷 직접 조회
      const { data: exactSnapshot, error: snapshotError } = await supabase
        .from('daily_stock_snapshots')
        .select('*')
        .eq('stock_item_id', stockItemId)
        .eq('snapshot_date', targetDate)
        .single();
      
      if (snapshotError && snapshotError.code !== 'PGRST116') {
        console.error(`스냅샷 조회 오류 (${warehouseName}):`, snapshotError);
        continue;
      }

      let warehouseQuantity = 0;
      let calculationMethod = 'snapshot_direct';

      // 정확한 날짜의 스냅샷이 있으면 바로 사용
      if (exactSnapshot) {
        warehouseQuantity = parseFloat(exactSnapshot.quantity);
        console.log(`✅ 스냅샷 직접 조회 성공 (${warehouseName}): ${warehouseQuantity}`);
      } else {
        console.log(`📊 스냅샷이 없음. 계산 방식으로 조회... (${warehouseName})`);
        
        // 2단계: 가장 가까운 과거 스냅샷 + 이후 거래 계산
        const { data: nearestSnapshot, error: nearestError } = await supabase
          .from('daily_stock_snapshots')
          .select('*')
          .eq('stock_item_id', stockItemId)
          .lte('snapshot_date', targetDate)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();
        
        let baseQuantity = 0;
        let calculationStartDate = '1900-01-01';
        
        if (nearestSnapshot && !nearestError) {
          baseQuantity = parseFloat(nearestSnapshot.quantity);
          calculationStartDate = nearestSnapshot.snapshot_date;
          calculationMethod = 'snapshot_incremental';
          console.log(`📈 기준 스냅샷 발견 (${warehouseName}): ${calculationStartDate} (${baseQuantity})`);
        } else {
          calculationMethod = 'full_calculation';
          console.log(`🔄 전체 거래 내역으로 계산 (${warehouseName})`);
        }
        
        // 기준 날짜 이후의 거래 내역 조회
        const { data: transactions, error: transError } = await supabase
          .from('stock_transactions')
          .select('transaction_type, quantity, transaction_date')
          .eq('stock_item_id', stockItemId)
          .gt('transaction_date', `${calculationStartDate} 23:59:59`)
          .lte('transaction_date', `${targetDate} 23:59:59`)
          .order('transaction_date', { ascending: true });
        
        if (transError) {
          console.error(`거래 내역 조회 오류 (${warehouseName}):`, transError);
          continue;
        }
        
        // 거래 내역을 기반으로 수량 계산
        warehouseQuantity = baseQuantity;
        
        if (transactions) {
          for (const transaction of transactions) {
            const amount = parseFloat(transaction.quantity);
            
            switch (transaction.transaction_type) {
              case 'incoming':
                warehouseQuantity += amount;
                break;
              case 'outgoing':
              case 'disposal':
                warehouseQuantity -= amount;
                break;
              case 'adjustment':
                warehouseQuantity += amount; // adjustment는 양수/음수 모두 가능
                break;
              case 'transfer':
                // transfer 거래는 현재 창고가 source인지 destination인지에 따라 처리
                // 이 거래는 source warehouse의 stock_item에 기록되므로 항상 출고로 처리
                warehouseQuantity -= amount;
                break;
            }
          }
        }
        
        // transfer 거래로 들어온 재고 확인 (다른 창고에서 이 창고로 이동)
        // 현재 창고가 destination인 transfer 거래 조회
        const { data: incomingTransfers, error: transferError } = await supabase
          .from('stock_transactions')
          .select('quantity, transaction_date, stock_item_id')
          .eq('destination_warehouse_id', stockItem.warehouse_id)
          .gt('transaction_date', `${calculationStartDate} 23:59:59`)
          .lte('transaction_date', `${targetDate} 23:59:59`)
          .eq('transaction_type', 'transfer');
        
        if (!transferError && incomingTransfers) {
          // 동일한 아이템(item_type, item_id)의 transfer만 필터링
          for (const transfer of incomingTransfers) {
            // transfer의 source stock_item이 동일한 아이템인지 확인
            const { data: sourceStockItem } = await supabase
              .from('stock_items')
              .select('item_type, item_id')
              .eq('id', transfer.stock_item_id)
              .single();
            
            if (sourceStockItem && 
                sourceStockItem.item_type === itemType && 
                sourceStockItem.item_id === actualItemId) {
              const amount = parseFloat(transfer.quantity);
              warehouseQuantity += amount; // 들어온 재고 추가
              console.log(`📦 Transfer 입고 (${warehouseName}): +${amount}`);
            }
          }
        }
        
        console.log(`🎯 계산 완료 (${warehouseName}): ${warehouseQuantity} (${transactions?.length || 0}건 거래)`);
      }

      warehouseResults.push({
        warehouseId: stockItem.warehouse_id,
        warehouseName,
        stockItemId,
        quantity: warehouseQuantity,
        calculationMethod
      });

      totalQuantity += warehouseQuantity;
    }

    const calculationTime = Date.now() - startTime;

    // 결과 포맷
    const result = {
      success: true,
      data: {
        itemId: actualItemId,
        combinedId: itemId, // 원본 조합된 ID 유지
        itemType,
        itemName: itemInfo.name,
        unit: itemInfo.unit || 'ea',
        date: targetDate,
        calculationTime: `${calculationTime}ms`,
        // 창고별 조회인 경우 단일 창고 정보, 전체 조회인 경우 총합
        ...(warehouseId ? {
          warehouseId,
          quantity: warehouseResults[0]?.quantity || 0,
          calculationMethod: warehouseResults[0]?.calculationMethod || 'not_found'
        } : {
          totalQuantity,
          warehouseCount: warehouseResults.length,
          warehouses: warehouseResults.map(w => ({
            warehouseId: w.warehouseId,
            warehouseName: w.warehouseName,
            quantity: w.quantity
          }))
        })
      }
    };

    console.log(`🎉 최종 결과: ${warehouseId ? '창고별' : '전체'} - ${warehouseId ? warehouseResults[0]?.quantity || 0 : totalQuantity}`);

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('재고 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 