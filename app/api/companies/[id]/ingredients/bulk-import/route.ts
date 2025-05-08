import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { parse } from 'csv-parse/sync';
import { updateMenuContainersForIngredient } from '@/app/lib/ingredient-price-utils';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 결과 인터페이스 정의
interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  costUpdates?: {
    success: number;
    failed: number;
    details: Array<{
      ingredient_id: string;
      updated?: number;
      message?: string;
      error?: string;
    }>;
  };
}

// CSV로 내보낸 구글 스프레드시트 데이터 처리
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: companyId } = await context.params;
    const session = await auth();
    
    if (!session || !session.userId) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const userId = session.userId;

    // 회사 정보 조회
    const company = await getServerCompany(companyId);
    if (!company) {
      return Response.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 멤버십 확인
    const membership = await getUserMembership({ userId, companyId });
    if (!membership) {
      return Response.json({ error: '이 회사에 접근할 권한이 없습니다.' }, { status: 403 });
    }

    // 기능 활성화 확인
    const isEnabled = await isFeatureEnabled('ingredients', companyId);
    if (!isEnabled) {
      return Response.json({ error: '식재료 기능이 활성화되지 않았습니다.' }, { status: 403 });
    }

    // 관리자 또는 소유자만 접근 가능
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return Response.json({ error: '식재료 일괄 추가 권한이 없습니다.' }, { status: 403 });
    }

    // 요청 데이터 파싱
    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return Response.json({ error: '요청 데이터를 파싱할 수 없습니다.' }, { status: 400 });
    }
    
    const { spreadsheetUrl } = requestData;
    
    if (!spreadsheetUrl) {
      return Response.json({ error: '스프레드시트 URL이 필요합니다.' }, { status: 400 });
    }

    // CSV URL 초기화
    let csvUrl = '';

    // 'pub?output=csv' 형식의 URL 확인
    if (spreadsheetUrl.includes('/pub?output=csv')) {
      // 이미 CSV URL 형식이므로 그대로 사용
      csvUrl = spreadsheetUrl;
    } else {
      // 일반 스프레드시트 URL에서 ID 추출
      const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match?.[1]) {
        return Response.json({ error: '유효하지 않은 구글 스프레드시트 URL입니다.' }, { status: 400 });
      }
      const spreadsheetId = match[1];
      
      // CSV URL 생성 (UTF-8 인코딩 지정)
      csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&charset=utf-8`;
    }
    
    // CSV 데이터 가져오기 - 타임아웃 설정 (60초)
    const controller = new AbortController();
    const signal = controller.signal;
    
    // 60초 타임아웃 설정
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      // CSV 데이터 가져오기
      const response = await fetch(csvUrl, {
        headers: {
          'Accept': 'text/csv;charset=UTF-8',
        },
        signal: signal
      });
      
      // 타임아웃 제거
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('스프레드시트 응답 오류:', response.status, errorText.substring(0, 200));
        return Response.json(
          { message: `스프레드시트를 가져올 수 없습니다(${response.status}). 스프레드시트가 공개되어 있는지 확인하세요.` },
          { status: 400 }
        );
      }
      
      const csvText = await response.text();
      
      if (!csvText || csvText.trim() === '') {
        return Response.json(
          { message: '스프레드시트 내용이 비어있습니다.' },
          { status: 400 }
        );
      }
      
      // CSV 파싱 (csv-parse 사용)
      let records;
      try {
        records = parse(csvText, {
          skip_empty_lines: true,
          trim: true,
          from_line: 4, // 4행부터 데이터 시작
        });
      } catch (parseError) {
        console.error('CSV 파싱 오류:', parseError);
        return Response.json(
          { message: 'CSV 파싱 오류: ' + (parseError instanceof Error ? parseError.message : '알 수 없는 오류') },
          { status: 400 }
        );
      }
      
      if (records.length === 0) {
        return Response.json(
          { message: '스프레드시트에 데이터가 없습니다.' },
          { status: 400 }
        );
      }

      // 결과 추적
      const results: ImportResult = {
        success: 0,
        failed: 0,
        errors: [],
        costUpdates: { 
          success: 0, 
          failed: 0, 
          details: []
        }
      };
      
      // Supabase 클라이언트 생성
      const supabase = createServerSupabaseClient();
      
      // 공급업체 목록 가져오기
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('company_id', companyId);
      
      // 공급업체 이름-ID 매핑 객체 생성
      const supplierMap = new Map();
      if (suppliers) {
        suppliers.forEach(supplier => {
          supplierMap.set(supplier.name.toLowerCase(), supplier.id);
        });
      }
      
      // 새로 추가된 공급업체 추적
      const newSuppliers = new Map();
      
      // 일괄 추가를 위한 배열
      const ingredientsToInsert: any[] = [];
      const ingredientsToUpdate: any[] = [];
      
      // 가격 이력을 위한 배열
      const priceHistoryToInsert: any[] = [];
      
      // 기존 식재료의 가격을 저장하기 위한 객체
      const existingIngredientsPrice: Record<string, number> = {};
      
      // 천단위 구분자(콤마)를 제거하고 숫자를 파싱하는 유틸리티 함수
      const parseNumericValue = (value: string | null | undefined): number | null => {
        if (!value) return null;
        // 천단위 구분자(콤마) 제거 후 변환
        const cleanedValue = value.replace(/,/g, '');
        const result = parseFloat(cleanedValue);
        return isNaN(result) ? null : result;
      };
      
      // 가격이 변경된 식재료의 정보를 저장할 배열
      interface PriceChangedIngredient {
        id: string;
        oldPrice: number;
        newPrice: number;
        packageAmount: number;
      }
      
      const priceChangedIngredientsArray: PriceChangedIngredient[] = [];
      
      // 각 행 처리
      for (const [index, record] of records.entries()) {
        try {
          // 데이터가 충분한지 확인
          if (!record || record.length < 19) { // S열까지 있어야 함
            results.failed++;
            results.errors.push(`행 #${index + 4}: 데이터 형식이 올바르지 않습니다.`);
            continue;
          }
          
          // B열(1번 인덱스): 식재료명 (필수)
          const name = record[1];
          if (!name) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 식재료명이 없습니다.`);
            continue;
          }
          
          // D열(3번 인덱스): 코드명
          const codeName = record[3] || null;
          
          // E열(4번 인덱스): 식재료업체
          const supplierName = record[4] || null;
          
          // F열(5번 인덱스): 포장당 식재료 양 (필수)
          const packageAmount = parseNumericValue(record[5]);
          if (!packageAmount || packageAmount <= 0) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 포장 단위 - ${record[5]}`);
            continue;
          }
          
          // G열(6번 인덱스): 단위 (필수)
          let unit = record[6];
          if (!unit) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 단위가 없습니다.`);
            continue;
          }
          
          // 단위 소문자 변환 (G -> g, ML -> ml)
          if (unit.toUpperCase() === 'G') {
            unit = 'g';
          } else if (unit.toUpperCase() === 'ML') {
            unit = 'ml';
          }
          
          // J열(9번 인덱스): 가격 (필수)
          const price = parseNumericValue(record[9]);
          if (price === null || price < 0) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 가격 - ${record[9]}`);
            continue;
          }
          
          // L열(11번 인덱스): 박스당 포장갯수
          const itemsPerBox = parseNumericValue(record[11]);
          if (record[11] && (itemsPerBox === null || itemsPerBox < 0)) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 박스당 포장갯수 - ${record[11]}`);
            continue;
          }
          
          // M열(12번 인덱스): 재고관리 등급
          const stockGrade = record[12] || null;
          
          // N열(13번 인덱스): 원산지
          const origin = record[13] || null;
          
          // O열(14번 인덱스): 칼로리
          const calories = parseNumericValue(record[14]);
          if (record[14] && (calories === null || calories < 0)) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 칼로리 값 - ${record[14]}`);
            continue;
          }
          
          // P열(15번 인덱스): 탄수화물
          const carbs = parseNumericValue(record[15]);
          if (record[15] && (carbs === null || carbs < 0)) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 탄수화물 값 - ${record[15]}`);
            continue;
          }
          
          // Q열(16번 인덱스): 단백질
          const protein = parseNumericValue(record[16]);
          if (record[16] && (protein === null || protein < 0)) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 단백질 값 - ${record[16]}`);
            continue;
          }
          
          // R열(17번 인덱스): 지방
          const fat = parseNumericValue(record[17]);
          if (record[17] && (fat === null || fat < 0)) {
            results.failed++;
            results.errors.push(`행 #${index + 4}: 유효하지 않은 지방 값 - ${record[17]}`);
            continue;
          }
          
          // S열(18번 인덱스): 알러지 유발물질
          const allergens = record[18] || null;
          
          // C열(2번 인덱스): 메모
          const memo1 = record[2] || null;
          
          // 공급업체 처리
          let supplierId = null;
          if (supplierName) {
            const supplierNameLower = supplierName.toLowerCase();
            
            // 기존 공급업체인지 확인
            if (supplierMap.has(supplierNameLower)) {
              supplierId = supplierMap.get(supplierNameLower);
            } 
            // 이미 이 세션에서 추가된 공급업체인지 확인
            else if (newSuppliers.has(supplierNameLower)) {
              supplierId = newSuppliers.get(supplierNameLower);
            } 
            // 새 공급업체 추가
            else {
              try {
                const { data: newSupplier, error: supplierError } = await supabase
                  .from('suppliers')
                  .insert({
                    company_id: companyId,
                    name: supplierName,
                  })
                  .select('id')
                  .single();
                
                if (supplierError) {
                  console.error('공급업체 추가 오류:', supplierError);
                  results.failed++;
                  results.errors.push(`행 #${index + 4}: 공급업체 '${supplierName}' 추가 실패`);
                  continue;
                }
                
                supplierId = newSupplier.id;
                newSuppliers.set(supplierNameLower, supplierId);
                supplierMap.set(supplierNameLower, supplierId);
              } catch (error) {
                console.error('공급업체 추가 오류:', error);
                results.failed++;
                results.errors.push(`행 #${index + 4}: 공급업체 '${supplierName}' 추가 실패`);
                continue;
              }
            }
          }
          
          // 중복 식재료 확인 (이름과 공급업체 기준)
          let existingIngredientQuery = supabase
            .from('ingredients')
            .select('id, price')
            .eq('company_id', companyId)
            .eq('name', name)
            .eq('package_amount', packageAmount);
          
          // supplier_id가 있는 경우 supplier_id도 일치하는지 확인
          if (supplierId) {
            existingIngredientQuery = existingIngredientQuery.eq('supplier_id', supplierId);
          } else {
            // supplier_id가 없는 경우 supplier_id가 null인 항목 찾기
            existingIngredientQuery = existingIngredientQuery.is('supplier_id', null);
          }
          
          const { data: existingIngredient } = await existingIngredientQuery.maybeSingle();
          
          // 식재료 데이터 객체 생성
          const ingredient = {
            company_id: companyId,
            name,
            code_name: codeName,
            supplier_id: supplierId,
            package_amount: packageAmount,
            unit,
            price,
            items_per_box: itemsPerBox,
            stock_grade: stockGrade,
            memo1: memo1,
            origin,
            calories,
            protein,
            fat,
            carbs,
            allergens,
          };
          
          // 중복 식재료 처리 (이름이 같으면 업데이트)
          if (existingIngredient) {
            // 가격이 변경된 경우에만 가격 이력에 추가할 것인지 확인
            const priceChanged = existingIngredient.price !== price;
            // 기존 가격 기록
            existingIngredientsPrice[existingIngredient.id] = existingIngredient.price;
            ingredientsToUpdate.push({
              id: existingIngredient.id,
              data: ingredient,
              name,
              priceChanged
            });
          } 
          // 새 식재료 추가
          else {
            ingredientsToInsert.push(ingredient);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(
            `행 #${index + 4}: 처리 오류 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`
          );
        }
      }
      
      // 데이터 처리 성능 개선: 배열이 너무 큰 경우 청크로 나누어 처리
      const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
          chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
      };
      
      // 일괄 추가를 청크로 나누어 처리 (최대 50개씩)
      const insertChunks = chunkArray(ingredientsToInsert, 50);
      
      // 배치 처리
      // 1. 새 식재료 일괄 추가 (청크 단위로)
      let insertedIngredients: { id: string; price: number }[] = [];
      for (const chunk of insertChunks) {
        if (chunk.length === 0) continue;
        
        try {
          const { data: inserted, error: batchInsertError } = await supabase
            .from('ingredients')
            .insert(chunk)
            .select('id, price'); // ID와 가격 정보 반환 추가
          
          if (batchInsertError) {
            console.error('식재료 청크 삽입 오류:', batchInsertError);
            results.failed += chunk.length;
            results.errors.push(`식재료 일괄 추가 실패: ${batchInsertError.message}`);
          } else {
            results.success += chunk.length;
            if (inserted) {
              insertedIngredients = [...insertedIngredients, ...inserted] as { id: string; price: number }[];
            }
          }
        } catch (error) {
          console.error('식재료 청크 삽입 오류:', error);
          results.failed += chunk.length;
          results.errors.push(`식재료 일괄 추가 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }
      
      // 새로 추가된 식재료들의 가격 이력 데이터 준비
      if (insertedIngredients.length > 0) {
        const currentTime = new Date().toISOString();
        const priceHistories = insertedIngredients.map(item => ({
          ingredient_id: item.id,
          price: item.price,
          recorded_at: currentTime
        }));
        
        // 가격 이력 배열에 추가
        priceHistoryToInsert.push(...priceHistories);
      }
      
      // 2. 기존 식재료 개별 업데이트 (Supabase에서는 일괄 업데이트를 지원하지 않음)
      // 업데이트 처리도 청크 단위로 수행
      const updateChunks = chunkArray(ingredientsToUpdate, 20);
      
      // 가격이 변경된 식재료 정보 추적
      for (const chunk of updateChunks) {
        for (const item of chunk) {
          try {
            const { error: updateError } = await supabase
              .from('ingredients')
              .update(item.data)
              .eq('id', item.id);
            
            if (updateError) {
              results.failed++;
              results.errors.push(`'${item.name}' 업데이트 실패: ${updateError.message}`);
            } else {
              results.success++;
              
              // 가격이 변경된 경우에만 가격 이력에 추가
              if (item.priceChanged) {
                priceHistoryToInsert.push({
                  ingredient_id: item.id,
                  price: item.data.price,
                  recorded_at: new Date().toISOString()
                });
                
                // 원가 업데이트를 위해 식재료 정보 저장
                priceChangedIngredientsArray.push({
                  id: item.id,
                  oldPrice: existingIngredientsPrice[item.id] || 0,
                  newPrice: item.data.price,
                  packageAmount: item.data.package_amount
                });
              }
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`'${item.name}' 업데이트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          }
        }
      }
      
      // 3. 가격 이력 일괄 추가 (청크 단위로)
      const priceHistoryChunks = chunkArray(priceHistoryToInsert, 100);
      
      for (const chunk of priceHistoryChunks) {
        if (chunk.length === 0) continue;
        
        try {
          const { error: historyError } = await supabase
            .from('ingredient_price_history')
            .insert(chunk);
          
          if (historyError) {
            console.error('가격 이력 청크 추가 오류:', historyError);
            // 이력 추가 실패는 심각한 오류가 아니므로 결과에 영향을 주지 않음
            results.errors.push(`가격 이력 추가 중 오류 발생 (식재료 추가/업데이트는 성공): ${historyError.message}`);
          }
        } catch (error) {
          console.error('가격 이력 청크 추가 오류:', error);
          // 이력 추가 실패는 심각한 오류가 아니므로 결과에 영향을 주지 않음
          results.errors.push(`가격 이력 추가 중 오류 발생 (식재료 추가/업데이트는 성공): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }
      
      // 4. 가격이 변경된 식재료의 메뉴 컨테이너 원가 업데이트
      results.costUpdates = { 
        success: 0, 
        failed: 0, 
        details: [] 
      };
      
      if (priceChangedIngredientsArray.length > 0) {
        console.log(`가격이 변경된 식재료 수: ${priceChangedIngredientsArray.length}`);
        
        // 각 식재료에 대해 메뉴 컨테이너 원가 업데이트 수행
        for (const ingredient of priceChangedIngredientsArray) {
          try {
            const updateResult = await updateMenuContainersForIngredient(
              ingredient.id,
              ingredient.oldPrice,
              ingredient.newPrice,
              ingredient.packageAmount
            );
            
            if (updateResult.success) {
              results.costUpdates.success++;
              results.costUpdates.details.push({
                ingredient_id: ingredient.id,
                updated: updateResult.updated,
                message: `${updateResult.updated}개의 메뉴 컨테이너 원가가 업데이트되었습니다.`
              });
            } else {
              results.costUpdates.failed++;
              results.costUpdates.details.push({
                ingredient_id: ingredient.id,
                error: updateResult.error || '알 수 없는 오류'
              });
            }
          } catch (error) {
            results.costUpdates.failed++;
            results.costUpdates.details.push({
              ingredient_id: ingredient.id,
              error: error instanceof Error ? error.message : '알 수 없는 오류'
            });
          }
        }
      }
      
      return Response.json(results);
    } catch (fetchError: unknown) {
      // 타임아웃 제거
      clearTimeout(timeoutId);
      
      // AbortError인 경우 타임아웃 메시지 반환
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return Response.json(
          { message: '스프레드시트 데이터를 가져오는 데 시간이 너무 오래 걸립니다. 스프레드시트 크기가 너무 큰지 확인하세요.' },
          { status: 408 }
        );
      }
      
      console.error('스프레드시트 가져오기 오류:', fetchError);
      return Response.json(
        { message: '스프레드시트를 가져오는 중 오류가 발생했습니다: ' + (fetchError instanceof Error ? fetchError.message : '알 수 없는 오류') },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('일괄 추가 API 오류:', error);
    return Response.json(
      {
        message: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
} 