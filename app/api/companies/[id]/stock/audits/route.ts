import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CreateStockAuditRequest, StockAuditListResponse } from '@/types/stock-audit';

/**
 * 재고 실사 목록 조회 API
 * 
 * @route GET /api/companies/[id]/stock/audits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
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

    // 쿼리 파라미터 처리
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');

    // 실사 목록 조회
    let query = supabase
      .from('stock_audits')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // 상태 필터 적용
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: audits, error: auditsError, count } = await query;

    if (auditsError) {
      console.error('실사 목록 조회 오류:', auditsError);
      return NextResponse.json(
        { error: '실사 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const response: StockAuditListResponse = {
      audits: audits || [],
      pagination: {
        total: count || 0,
        page,
        pageSize,
        pageCount: Math.ceil((count || 0) / pageSize)
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('실사 목록 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 새로운 재고 실사 생성 API
 * 
 * @route POST /api/companies/[id]/stock/audits
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
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
    const body: CreateStockAuditRequest = await request.json();
    const { name, description, audit_date, item_types = ['ingredient', 'container'], warehouse_id } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '실사명을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!audit_date) {
      return NextResponse.json(
        { error: '실사 날짜를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 창고 ID 결정 (요청에서 제공되지 않으면 기본 창고 사용)
    let finalWarehouseId = warehouse_id;
    if (!finalWarehouseId) {
      const { data: defaultWarehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .single();

      if (warehouseError || !defaultWarehouse) {
        return NextResponse.json(
          { error: '기본 창고를 찾을 수 없습니다. 창고를 먼저 설정해주세요.' },
          { status: 400 }
        );
      }
      
      finalWarehouseId = defaultWarehouse.id;
    }

    // 트랜잭션 시작: 실사 세션 생성 + 실사 항목 생성
    const { data: audit, error: auditError } = await supabase
      .from('stock_audits')
      .insert({
        company_id: companyId,
        name: name.trim(),
        description: description?.trim(),
        audit_date: audit_date, // 사용자가 선택한 실사 날짜
        warehouse_id: finalWarehouseId, // 창고 ID 추가
        created_by: userId,
        status: 'in_progress'
      })
      .select()
      .single();

    if (auditError) {
      console.error('실사 세션 생성 오류:', auditError);
      return NextResponse.json(
        { 
          error: '실사 세션을 생성하는데 실패했습니다.',
          details: auditError.message 
        },
        { status: 500 }
      );
    }

    // 모든 등록된 항목들을 조회하여 실사 대상 결정
    let allItems = [];

    // 1. 식자재 항목 조회 (재고 정보와 함께)
    if (item_types.includes('ingredient')) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name, unit, code_name')
        .eq('company_id', companyId)
        .not('stock_grade', 'is', null); // 재고관리 등급이 있는 식자재만

      if (ingredientsError) {
        console.error('식자재 조회 오류:', ingredientsError);
        return NextResponse.json(
          { 
            error: '식자재를 조회하는데 실패했습니다.',
            details: ingredientsError.message 
          },
          { status: 500 }
        );
      }

      if (ingredients && ingredients.length > 0) {
        // 해당 식자재들의 재고 정보 조회 (전체 창고 대상)
        const ingredientIds = ingredients.map(ing => ing.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .in('item_id', ingredientIds);

        if (stockError) {
          console.error('식자재 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '식자재 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 식자재 항목들을 실사 항목 형태로 변환
        for (const ingredient of ingredients) {
          const stockItem = stockItems?.find(stock => stock.item_id === ingredient.id);
          allItems.push({
            id: stockItem?.id || null,
            item_type: 'ingredient',
            item_id: ingredient.id,
            item_name: ingredient.name,
            item_code: ingredient.code_name, // 검색 성능 향상을 위해 코드명 추가
            unit: ingredient.unit || 'EA',
            current_quantity: stockItem?.current_quantity || 0,
            has_stock_record: !!stockItem,
            needs_warehouse_update: stockItem && stockItem.warehouse_id !== finalWarehouseId
          });
        }
      }
    }

    // 2. 용기 항목 조회 (재고 정보와 함께) - 최상위 레벨만
    if (item_types.includes('container')) {
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('id, name, price, code_name')
        .eq('company_id', companyId)
        .is('parent_container_id', null); // 상위 그룹이 없는 컨테이너만 조회

      if (containersError) {
        console.error('용기 조회 오류:', containersError);
        return NextResponse.json(
          { 
            error: '용기를 조회하는데 실패했습니다.',
            details: containersError.message 
          },
          { status: 500 }
        );
      }

      if (containers && containers.length > 0) {
        // 해당 용기들의 재고 정보 조회 (전체 창고 대상)
        const containerIds = containers.map(cont => cont.id);
        const { data: stockItems, error: stockError } = await supabase
          .from('stock_items')
          .select('id, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', containerIds);

        if (stockError) {
          console.error('용기 재고 조회 오류:', stockError);
          return NextResponse.json(
            { 
              error: '용기 재고를 조회하는데 실패했습니다.',
              details: stockError.message 
            },
            { status: 500 }
          );
        }

        // 하위 컨테이너들을 상위 그룹별로 그룹화하고 최대 수량으로 집계
        const containerMap = new Map();
        
        // 먼저 모든 하위 컨테이너들을 조회하여 상위 그룹별로 분류
        for (const topContainer of containers) {
          const { data: subContainers, error: subError } = await supabase
            .from('containers')
            .select('id, name, parent_container_id')
            .eq('company_id', companyId)
            .eq('parent_container_id', topContainer.id);

          if (subError) {
            console.error('하위 컨테이너 조회 오류:', subError);
            continue;
          }

          // 하위 컨테이너들이 있으면 각각의 재고를 확인
          if (subContainers && subContainers.length > 0) {
            const subContainerIds = subContainers.map(sub => sub.id);
            const { data: subStockItems, error: subStockError } = await supabase
              .from('stock_items')
              .select('id, item_id, current_quantity, warehouse_id')
              .eq('company_id', companyId)
              .eq('item_type', 'container')
              .in('item_id', subContainerIds);

            if (subStockError) {
              console.error('하위 컨테이너 재고 조회 오류:', subStockError);
              continue;
            }

            // 하위 컨테이너들의 최대 재고량 찾기
            let maxQuantity = Number.NEGATIVE_INFINITY; // 음수 포함하여 진짜 최대값 찾기
            let maxStockItem = null;
            
            for (const subContainer of subContainers) {
              const subStockItem = subStockItems?.find(stock => stock.item_id === subContainer.id);
              const quantity = subStockItem?.current_quantity || 0;
              
              if (quantity > maxQuantity) {
                maxQuantity = quantity;
                maxStockItem = subStockItem;
              }
            }
            
            // 하위 아이템이 없거나 모든 재고가 0인 경우 처리
            if (maxQuantity === Number.NEGATIVE_INFINITY) {
              maxQuantity = 0;
            }

            // 상위 그룹으로 항목 추가 (최대 수량 사용)
            allItems.push({
              id: maxStockItem?.id || null,
              item_type: 'container',
              item_id: topContainer.id, // 상위 그룹 ID 사용
              item_name: topContainer.name, // 상위 그룹명 사용
              item_code: topContainer.code_name, // 검색 성능 향상을 위해 코드명 추가
              unit: '개',
              current_quantity: maxQuantity, // 하위 중 최대 수량
              has_stock_record: !!maxStockItem,
              needs_warehouse_update: maxStockItem && maxStockItem.warehouse_id !== finalWarehouseId
            });
          } else {
            // 하위 컨테이너가 없으면 그 자체로 처리
            const stockItem = stockItems?.find(stock => stock.item_id === topContainer.id);
            allItems.push({
              id: stockItem?.id || null,
              item_type: 'container',
              item_id: topContainer.id,
              item_name: topContainer.name,
              item_code: topContainer.code_name, // 검색 성능 향상을 위해 코드명 추가
              unit: '개',
              current_quantity: stockItem?.current_quantity || 0,
              has_stock_record: !!stockItem,
              needs_warehouse_update: stockItem && stockItem.warehouse_id !== finalWarehouseId
            });
          }
        }
      }
    }

    console.log(`실사 생성: 회사 ${companyId}에서 ${allItems.length}개 항목 조회됨`);
    console.log(`항목 타입별 분포:`, allItems.reduce((acc, item) => {
      acc[item.item_type] = (acc[item.item_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    console.log(`재고 레코드 있는 항목: ${allItems.filter(item => item.has_stock_record).length}개`);
    console.log(`재고 레코드 없는 항목: ${allItems.filter(item => !item.has_stock_record).length}개`);

    if (allItems.length === 0) {
      console.log('등록된 항목이 없어서 빈 실사 생성');
      return NextResponse.json({
        audit,
        items_count: 0
      }, { status: 201 });
    }

    // 재고 레코드가 없는 항목들에 대해 stock_items 레코드 생성
    const itemsWithoutStock = allItems.filter(item => !item.has_stock_record);
    if (itemsWithoutStock.length > 0) {
      console.log(`${itemsWithoutStock.length}개 항목에 대해 재고 레코드 생성 중...`);
      
      // 이미 존재하는 stock_items를 다시 한번 확인 (동시성 문제 방지)
      const itemTypesAndIds = itemsWithoutStock.map(item => ({
        item_type: item.item_type,
        item_id: item.item_id
      }));

      // 현재 존재하는 stock_items를 타입별로 조회
      const ingredientIds = itemTypesAndIds
        .filter(item => item.item_type === 'ingredient')
        .map(item => item.item_id);
      const containerIds = itemTypesAndIds
        .filter(item => item.item_type === 'container')
        .map(item => item.item_id);

      let existingStockItems = [];

      // 식자재 재고 레코드 조회
      if (ingredientIds.length > 0) {
        const { data: ingredientStockItems, error: ingredientStockError } = await supabase
          .from('stock_items')
          .select('id, item_type, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'ingredient')
          .in('item_id', ingredientIds);

        if (ingredientStockError) {
          console.error('기존 식자재 재고 레코드 확인 오류:', ingredientStockError);
          await supabase.from('stock_audits').delete().eq('id', audit.id);
          return NextResponse.json(
            { 
              error: '기존 식자재 재고 레코드를 확인하는데 실패했습니다.',
              details: ingredientStockError.message 
            },
            { status: 500 }
          );
        }

        if (ingredientStockItems) {
          existingStockItems.push(...ingredientStockItems);
        }
      }

      // 용기 재고 레코드 조회
      if (containerIds.length > 0) {
        const { data: containerStockItems, error: containerStockError } = await supabase
          .from('stock_items')
          .select('id, item_type, item_id, current_quantity, warehouse_id')
          .eq('company_id', companyId)
          .eq('item_type', 'container')
          .in('item_id', containerIds);

        if (containerStockError) {
          console.error('기존 용기 재고 레코드 확인 오류:', containerStockError);
          await supabase.from('stock_audits').delete().eq('id', audit.id);
          return NextResponse.json(
            { 
              error: '기존 용기 재고 레코드를 확인하는데 실패했습니다.',
              details: containerStockError.message 
            },
            { status: 500 }
          );
        }

        if (containerStockItems) {
          existingStockItems.push(...containerStockItems);
        }
      }



      // 기존 재고 레코드를 allItems에 반영
      if (existingStockItems && existingStockItems.length > 0) {
        for (const existingItem of existingStockItems) {
          const targetItem = allItems.find(item => 
            item.item_type === existingItem.item_type && 
            item.item_id === existingItem.item_id
          );
          if (targetItem) {
            targetItem.id = existingItem.id;
            targetItem.has_stock_record = true;
            targetItem.current_quantity = existingItem.current_quantity;
            targetItem.needs_warehouse_update = existingItem.warehouse_id !== finalWarehouseId;
          }
        }
      }

      // 여전히 재고 레코드가 없는 항목들만 필터링
      const finalItemsToCreate = itemsWithoutStock.filter(item => {
        const targetItem = allItems.find(ai => 
          ai.item_type === item.item_type && 
          ai.item_id === item.item_id
        );
        return targetItem && !targetItem.has_stock_record;
      });

      if (finalItemsToCreate.length > 0) {
        const stockItemsToCreate = finalItemsToCreate.map(item => ({
          company_id: companyId,
          item_type: item.item_type,
          item_id: item.item_id,
          current_quantity: 0,
          unit: item.unit,
          warehouse_id: finalWarehouseId // 창고 ID 추가
        }));

        const { data: createdStockItems, error: stockItemsCreateError } = await supabase
          .from('stock_items')
          .insert(stockItemsToCreate)
          .select('id, item_type, item_id');

        if (stockItemsCreateError) {
          console.error('재고 레코드 생성 오류:', stockItemsCreateError);
          // 실사 세션도 삭제
          await supabase
            .from('stock_audits')
            .delete()
            .eq('id', audit.id);

          return NextResponse.json(
            { 
              error: '재고 레코드를 생성하는데 실패했습니다.',
              details: stockItemsCreateError.message 
            },
            { status: 500 }
          );
        }

        // 생성된 stock_item_id를 allItems에 업데이트
        if (createdStockItems) {
          for (const createdItem of createdStockItems) {
            const targetItem = allItems.find(item => 
              item.item_type === createdItem.item_type && 
              item.item_id === createdItem.item_id
            );
            if (targetItem) {
              targetItem.id = createdItem.id;
              targetItem.has_stock_record = true;
            }
          }
        }

        console.log(`재고 레코드 생성 완료: ${createdStockItems?.length || 0}개`);
      } else {
        console.log('모든 항목이 이미 재고 레코드를 가지고 있어 생성 건너뜀');
      }
    }

    // 창고 업데이트가 필요한 항목들 처리
    const itemsNeedingWarehouseUpdate = allItems.filter(item => item.needs_warehouse_update);
    if (itemsNeedingWarehouseUpdate.length > 0) {
      console.log(`${itemsNeedingWarehouseUpdate.length}개 항목의 창고를 업데이트 중...`);
      
      for (const item of itemsNeedingWarehouseUpdate) {
        try {
          // 먼저 대상 창고에 동일한 아이템이 있는지 확인
          const { data: existingInTargetWarehouse, error: checkError } = await supabase
            .from('stock_items')
            .select('id, current_quantity')
            .eq('company_id', companyId)
            .eq('warehouse_id', finalWarehouseId)
            .eq('item_type', item.item_type)
            .eq('item_id', item.item_id)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116은 "row not found" 오류이므로 정상
            console.error(`재고 레코드 ${item.id} 확인 오류:`, checkError);
            continue;
          }

          if (existingInTargetWarehouse) {
            // 대상 창고에 이미 레코드가 있으면, 기존 레코드의 수량을 합치고 원본 레코드 삭제
            const { error: updateError } = await supabase
              .from('stock_items')
              .update({ 
                current_quantity: existingInTargetWarehouse.current_quantity + item.current_quantity 
              })
              .eq('id', existingInTargetWarehouse.id);

            if (updateError) {
              console.error(`재고 레코드 ${existingInTargetWarehouse.id} 수량 업데이트 오류:`, updateError);
              continue;
            }

            // 원본 레코드 삭제
            const { error: deleteError } = await supabase
              .from('stock_items')
              .delete()
              .eq('id', item.id);

            if (deleteError) {
              console.error(`재고 레코드 ${item.id} 삭제 오류:`, deleteError);
              continue;
            }

            // allItems에서 해당 아이템의 id를 업데이트
            item.id = existingInTargetWarehouse.id;
            
          } else {
            // 대상 창고에 레코드가 없으면 단순히 창고 ID만 업데이트
            const { error: updateError } = await supabase
              .from('stock_items')
              .update({ warehouse_id: finalWarehouseId })
              .eq('id', item.id);

            if (updateError) {
              console.error(`재고 레코드 ${item.id} 창고 업데이트 오류:`, updateError);
              continue;
            }
          }
        } catch (error) {
          console.error(`재고 레코드 ${item.id} 처리 중 예외 발생:`, error);
          continue;
        }
      }
      
      console.log(`창고 업데이트 완료: ${itemsNeedingWarehouseUpdate.length}개`);
    }

    // 실사 항목 데이터 준비
    const auditItems = allItems.map(item => ({
      audit_id: audit.id,
      stock_item_id: item.id, // 이제 모든 항목이 stock_item_id를 가짐
      item_name: item.item_name,
      item_code: item.item_code, // 검색 성능 향상을 위해 코드명 저장
      item_type: item.item_type,
      unit: item.unit,
      book_quantity: item.current_quantity,
      status: 'pending'
    }));

    // 실사 항목들 일괄 생성
    if (auditItems.length > 0) {
      console.log(`${auditItems.length}개 실사 항목 생성 시도`);
      
      const { error: itemsError } = await supabase
        .from('stock_audit_items')
        .insert(auditItems);

      if (itemsError) {
        console.error('실사 항목 생성 오류:', itemsError);
        // 실사 세션도 삭제
        await supabase
          .from('stock_audits')
          .delete()
          .eq('id', audit.id);

        return NextResponse.json(
          { 
            error: '실사 항목을 생성하는데 실패했습니다.',
            details: itemsError.message 
          },
          { status: 500 }
        );
      }
      
      console.log(`실사 항목 생성 완료: ${auditItems.length}개`);
    }

    return NextResponse.json({
      audit,
      items_count: auditItems.length
    }, { status: 201 });

  } catch (error) {
    console.error('실사 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 