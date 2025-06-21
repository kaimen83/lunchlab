const { chromium } = require('playwright');

async function testWarehouseAudit() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('노송식당 재고 실사 테스트 시작...');
    
    // 로그인 페이지로 이동
    await page.goto('http://localhost:3000/sign-in');
    
    // 로그인 (사용자 계정으로 로그인 필요)
    console.log('로그인 대기 중... 수동으로 로그인해주세요.');
    await page.waitForURL('http://localhost:3000/', { timeout: 120000 });
    
    console.log('로그인 완료, 노송식당 선택 중...');
    
    // 노송식당 클릭 (회사 카드에서 찾기)
    await page.click('text=노송식당');
    
    // 재고관리 페이지로 이동
    await page.waitForURL(/\/companies\/[^\/]+$/);
    await page.click('text=재고관리');
    
    // 재고 실사 탭 클릭
    await page.click('text=재고 실사');
    
    console.log('재고 실사 페이지 진입 완료');
    
    // 새 실사 생성 버튼 클릭
    await page.click('text=새 실사');
    
    // 실사 정보 입력
    await page.fill('input[placeholder*="실사명"]', '창고별 테스트 실사');
    await page.fill('textarea[placeholder*="설명"]', '인천창고 용기A 조정 테스트');
    
    // 창고 선택 (인천창고)
    await page.click('select'); // 창고 선택 드롭다운
    await page.selectOption('select', { label: '인천창고' });
    
    // 실사 생성
    await page.click('text=실사 생성');
    
    console.log('실사 생성 완료, 용기A 검색 중...');
    
    // 실사 페이지로 이동 대기
    await page.waitForURL(/\/companies\/[^\/]+\/stock\/audit/);
    
    // 용기A 검색
    await page.fill('input[placeholder*="검색"]', '용기A');
    await page.press('input[placeholder*="검색"]', 'Enter');
    
    // 용기A 행 찾기
    const containerARow = await page.locator('tr:has-text("용기A")').first();
    
    if (await containerARow.count() > 0) {
      console.log('용기A 발견, 실사량 입력 중...');
      
      // 실사량 입력 필드 클릭 (actual_quantity 컬럼)
      const actualQuantityCell = containerARow.locator('td').nth(4); // 실사량은 보통 5번째 컬럼
      await actualQuantityCell.click();
      
      // 실사량 입력
      await page.keyboard.type('50');
      await page.keyboard.press('Enter');
      
      console.log('용기A 실사량 50개로 입력 완료');
      
      // 저장
      await page.click('text=저장');
      
      // 실사 완료 버튼 클릭
      await page.click('text=실사 완료');
      
      // 확인 대화상자
      await page.click('text=확인');
      
      console.log('실사 완료 처리 완료');
      
      // 재고 목록 탭으로 이동하여 확인
      await page.click('text=재고 목록');
      
      // 인천창고 필터
      await page.click('select[name="warehouse"]');
      await page.selectOption('select[name="warehouse"]', { label: '인천창고' });
      
      // 용기A 검색
      await page.fill('input[placeholder*="검색"]', '용기A');
      await page.press('input[placeholder*="검색"]', 'Enter');
      
      // 인천창고 용기A 수량 확인
      const incheonQuantity = await page.locator('tr:has-text("용기A") td').nth(2).textContent();
      console.log(`인천창고 용기A 수량: ${incheonQuantity}`);
      
      // 부천창고 필터로 변경
      await page.selectOption('select[name="warehouse"]', { label: '부천창고' });
      
      // 부천창고 용기A 수량 확인
      const bucheonQuantity = await page.locator('tr:has-text("용기A") td').nth(2).textContent();
      console.log(`부천창고 용기A 수량: ${bucheonQuantity}`);
      
      // 거래내역 탭으로 이동
      await page.click('text=거래 내역');
      
      // 최근 거래 확인
      const recentTransaction = await page.locator('tbody tr').first();
      const transactionDetails = await recentTransaction.allTextContents();
      console.log('최근 거래 내역:', transactionDetails.join(' | '));
      
      // 버그 확인
      if (incheonQuantity === '50' && bucheonQuantity !== '50') {
        console.log('✅ 정상: 인천창고만 수량이 변경됨');
      } else if (bucheonQuantity === '50' && incheonQuantity !== '50') {
        console.log('❌ 버그 발견: 인천창고 실사인데 부천창고 수량이 변경됨!');
      } else {
        console.log('⚠️  예상과 다른 결과');
      }
      
    } else {
      console.log('용기A를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    console.log('테스트 완료, 브라우저를 5초 후 닫습니다...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

testWarehouseAudit();