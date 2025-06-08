import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { CreateSnapshotResponse } from '@/types/stock';

/**
 * 일별 재고 스냅샷 생성 Cron Job
 * 
 * @route GET /api/cron/daily-snapshot
 * @description 매일 자정에 실행되어 전날의 재고 스냅샷을 생성
 * @security Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest): Promise<NextResponse<CreateSnapshotResponse>> {
  try {
    // 보안 검증 - Vercel Cron Job 인증
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { 
          success: false, 
          processed: 0, 
          date: '', 
          errors: ['Unauthorized'] 
        },
        { status: 401 }
      );
    }

    console.log('Daily snapshot cron job started');

    // Supabase 서비스 역할 클라이언트 생성
    const supabase = createServerSupabaseClient();

    // 어제 날짜 계산 (UTC 기준)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const snapshotDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    console.log(`Creating snapshots for date: ${snapshotDate}`);

    // 이미 해당 날짜의 스냅샷이 존재하는지 확인
    const { data: existingSnapshots, error: checkError } = await supabase
      .from('daily_stock_snapshots')
      .select('id')
      .eq('snapshot_date', snapshotDate)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing snapshots:', checkError);
      return NextResponse.json(
        { 
          success: false, 
          processed: 0, 
          date: snapshotDate, 
          errors: [`Check error: ${checkError.message}`] 
        },
        { status: 500 }
      );
    }

    if (existingSnapshots && existingSnapshots.length > 0) {
      console.log(`Snapshots for ${snapshotDate} already exist, skipping`);
      return NextResponse.json({
        success: true,
        processed: 0,
        date: snapshotDate,
        errors: [`Snapshots for ${snapshotDate} already exist`]
      });
    }

    // 모든 재고 항목 조회 (관련 정보와 함께)
    const { data: stockItems, error: stockError } = await supabase
      .from('stock_items')
      .select(`
        id,
        company_id,
        item_type,
        item_id,
        current_quantity,
        unit
      `);

    if (stockError) {
      console.error('Error fetching stock items:', stockError);
      return NextResponse.json(
        { 
          success: false, 
          processed: 0, 
          date: snapshotDate, 
          errors: [`Stock fetch error: ${stockError.message}`] 
        },
        { status: 500 }
      );
    }

    if (!stockItems || stockItems.length === 0) {
      console.log('No stock items found');
      return NextResponse.json({
        success: true,
        processed: 0,
        date: snapshotDate
      });
    }

    console.log(`Found ${stockItems.length} stock items to process`);

    // 각 재고 항목에 대해 항목명 조회 및 스냅샷 데이터 준비
    const snapshots = [];
    const errors: string[] = [];

    for (const stockItem of stockItems) {
      try {
        let itemName = 'Unknown Item';

        // 항목 타입에 따라 이름 조회
        if (stockItem.item_type === 'ingredient') {
          const { data: ingredient, error: ingredientError } = await supabase
            .from('ingredients')
            .select('name')
            .eq('id', stockItem.item_id)
            .single();

          if (ingredientError) {
            console.error(`Error fetching ingredient ${stockItem.item_id}:`, ingredientError);
            errors.push(`Ingredient ${stockItem.item_id}: ${ingredientError.message}`);
            continue;
          }

          itemName = ingredient?.name || 'Unknown Ingredient';
        } else if (stockItem.item_type === 'container') {
          const { data: container, error: containerError } = await supabase
            .from('containers')
            .select('name')
            .eq('id', stockItem.item_id)
            .single();

          if (containerError) {
            console.error(`Error fetching container ${stockItem.item_id}:`, containerError);
            errors.push(`Container ${stockItem.item_id}: ${containerError.message}`);
            continue;
          }

          itemName = container?.name || 'Unknown Container';
        }

        // 스냅샷 데이터 추가
        snapshots.push({
          company_id: stockItem.company_id,
          stock_item_id: stockItem.id,
          snapshot_date: snapshotDate,
          quantity: Number(stockItem.current_quantity) || 0,
          unit: stockItem.unit || '개',
          item_type: stockItem.item_type,
          item_name: itemName
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing stock item ${stockItem.id}:`, error);
        errors.push(`Stock item ${stockItem.id}: ${errorMessage}`);
      }
    }

    if (snapshots.length === 0) {
      console.log('No valid snapshots to create');
      return NextResponse.json({
        success: false,
        processed: 0,
        date: snapshotDate,
        errors: ['No valid snapshots to create', ...errors]
      });
    }

    console.log(`Prepared ${snapshots.length} snapshots for insertion`);

    // 배치 삽입 (upsert 사용하여 중복 방지)
    const { data: insertedSnapshots, error: insertError } = await supabase
      .from('daily_stock_snapshots')
      .upsert(snapshots, { 
        onConflict: 'company_id,stock_item_id,snapshot_date',
        ignoreDuplicates: false 
      })
      .select('id');

    if (insertError) {
      console.error('Error inserting snapshots:', insertError);
      return NextResponse.json(
        { 
          success: false, 
          processed: 0, 
          date: snapshotDate, 
          errors: [`Insert error: ${insertError.message}`, ...errors] 
        },
        { status: 500 }
      );
    }

    const processedCount = insertedSnapshots?.length || 0;
    console.log(`Successfully created ${processedCount} snapshots for ${snapshotDate}`);

    // 성공 응답
    const response: CreateSnapshotResponse = {
      success: true,
      processed: processedCount,
      date: snapshotDate
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Daily snapshot cron job error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        processed: 0, 
        date: '', 
        errors: [`Server error: ${errorMessage}`] 
      },
      { status: 500 }
    );
  }
} 