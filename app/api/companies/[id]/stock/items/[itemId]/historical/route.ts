import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 특정 날짜의 재고 현황 조회 API
 * 
 * 최적화 전략:
 * 1. 스냅샷 우선 조회 (O(1))
 * 2. 스냅샷이 없으면 가장 가까운 과거 스냅샷 + 이후 거래 계산 (O(k))
 * 3. 스냅샷이 전혀 없으면 전체 거래 계산 (O(n))
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date');
    
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
    const { id: companyId, itemId: stockItemId } = await params;
    
    console.log(`🔍 재고 조회 시작: ${stockItemId} @ ${targetDate}`);
    
    // 1단계: 해당 날짜의 스냅샷 직접 조회 (최고 성능)
    const { data: exactSnapshot, error: snapshotError } = await supabase
      .from('daily_stock_snapshots')
      .select('*')
      .eq('stock_item_id', stockItemId)
      .eq('snapshot_date', targetDate)
      .single();
    
    if (snapshotError && snapshotError.code !== 'PGRST116') {
      console.error('스냅샷 조회 오류:', snapshotError);
      return NextResponse.json(
        { error: '스냅샷 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 정확한 날짜의 스냅샷이 있으면 바로 반환
    if (exactSnapshot) {
      console.log(`✅ 스냅샷 직접 조회 성공: ${exactSnapshot.quantity}`);
      
      return NextResponse.json({
        success: true,
        data: {
          stockItemId: exactSnapshot.stock_item_id,
          itemType: exactSnapshot.item_type,
          itemName: exactSnapshot.item_name,
          unit: exactSnapshot.unit,
          quantity: parseFloat(exactSnapshot.quantity),
          date: exactSnapshot.snapshot_date,
          calculationMethod: 'snapshot_direct',
          calculationTime: '< 1ms'
        }
      });
    }
    
    console.log(`📊 스냅샷이 없음. 계산 방식으로 조회...`);
    
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
    let calculationMethod = 'full_calculation';
    
    if (nearestSnapshot && !nearestError) {
      // 가장 가까운 스냅샷을 기준으로 설정
      baseQuantity = parseFloat(nearestSnapshot.quantity);
      calculationStartDate = nearestSnapshot.snapshot_date;
      calculationMethod = 'snapshot_incremental';
      
      console.log(`📈 기준 스냅샷 발견: ${calculationStartDate} (${baseQuantity})`);
    } else {
      console.log(`🔄 전체 거래 내역으로 계산`);
    }
    
    // 계산 시작 시간 측정
    const startTime = Date.now();
    
    // 기준 날짜 이후의 거래 내역 조회
    const { data: transactions, error: transError } = await supabase
      .from('stock_transactions')
      .select('transaction_type, quantity, transaction_date')
      .eq('stock_item_id', stockItemId)
      .gt('transaction_date', `${calculationStartDate} 23:59:59`)
      .lte('transaction_date', `${targetDate} 23:59:59`)
      .order('transaction_date', { ascending: true });
    
    if (transError) {
      console.error('거래 내역 조회 오류:', transError);
      return NextResponse.json(
        { error: '거래 내역 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    // 거래 내역을 기반으로 수량 계산
    let calculatedQuantity = baseQuantity;
    
    if (transactions) {
      for (const transaction of transactions) {
        const amount = parseFloat(transaction.quantity);
        
        switch (transaction.transaction_type) {
          case 'incoming':
            calculatedQuantity += amount;
            break;
          case 'outgoing':
          case 'disposal':
            calculatedQuantity -= amount;
            break;
          case 'adjustment':
            calculatedQuantity += amount; // adjustment는 양수/음수 모두 가능
            break;
        }
      }
    }
    
    const calculationTime = Date.now() - startTime;
    
    console.log(`🎯 계산 완료: ${calculatedQuantity} (${calculationTime}ms, ${transactions?.length || 0}건 거래)`);
    
    // 재고 항목 정보 조회
    const { data: stockItem, error: itemError } = await supabase
      .from('stock_items')
      .select(`
        item_type,
        unit,
        ingredients(name),
        containers(name)
      `)
      .eq('id', stockItemId)
      .eq('company_id', companyId)
      .single();
    
    if (itemError || !stockItem) {
      return NextResponse.json(
        { error: '재고 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 아이템 이름 결정
    let itemName = '';
    if (stockItem.item_type === 'ingredient' && stockItem.ingredients) {
      itemName = Array.isArray(stockItem.ingredients) 
        ? stockItem.ingredients[0]?.name 
        : (stockItem.ingredients as any).name;
    } else if (stockItem.item_type === 'container' && stockItem.containers) {
      itemName = Array.isArray(stockItem.containers) 
        ? stockItem.containers[0]?.name 
        : (stockItem.containers as any).name;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        stockItemId,
        itemType: stockItem.item_type,
        itemName,
        unit: stockItem.unit,
        quantity: calculatedQuantity,
        date: targetDate,
        calculationMethod,
        calculationTime: `${calculationTime}ms`,
        transactionsProcessed: transactions?.length || 0,
        baseSnapshot: nearestSnapshot ? {
          date: nearestSnapshot.snapshot_date,
          quantity: parseFloat(nearestSnapshot.quantity)
        } : null
      }
    });
    
  } catch (error) {
    console.error('재고 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 