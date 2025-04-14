import { utils, writeFile, type WorkSheet } from 'xlsx';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MealPlan } from '../types';
import { getMealPlansByDate } from '../utils';

// 식단 내용을, 메뉴 이름들을 쉼표로 연결한 문자열로 반환
const getMealPlanMenusText = (mealPlan: MealPlan | undefined): string => {
  if (!mealPlan || !mealPlan.meal_plan_menus || mealPlan.meal_plan_menus.length === 0) {
    return '';
  }
  
  return mealPlan.meal_plan_menus.map(menu => menu.menu.name).join(', ');
};

// 날짜별 식단을 찾아 반환
const getMealPlanForDateAndTime = (
  mealPlans: MealPlan[], 
  date: Date, 
  mealTime: 'breakfast' | 'lunch' | 'dinner'
): MealPlan | undefined => {
  const plans = getMealPlansByDate(mealPlans, date, mealTime);
  return plans.length > 0 ? plans[0] : undefined;
};

// 주간 식단표 데이터 생성 - 웹 화면과 유사한 테이블 형식으로 개선
export const exportWeeklyMealPlans = (
  daysOfWeek: Date[],
  mealPlans: MealPlan[],
  companyName: string
): void => {
  // 워크시트 데이터 준비
  const wsData = [
    // 첫 번째 행: 헤더
    ['요일', '식사 시간', '메뉴'],
  ];
  
  // 셀 병합을 위한 정보
  interface MergeCell {
    s: { r: number; c: number };
    e: { r: number; c: number };
  }
  
  const merges: MergeCell[] = [];
  let rowIndex = 1; // 데이터 시작 행 (헤더 다음)
  
  // 각 날짜별 식단 데이터 추가
  daysOfWeek.forEach((day, dayIndex) => {
    const dateLabel = `${format(day, 'MM/dd')} (${format(day, 'E', { locale: ko })})`;
    
    // 아침
    const breakfastPlan = getMealPlanForDateAndTime(mealPlans, day, 'breakfast');
    wsData.push([dateLabel, '아침', getMealPlanMenusText(breakfastPlan)]);
    
    // 점심
    const lunchPlan = getMealPlanForDateAndTime(mealPlans, day, 'lunch');
    wsData.push(['', '점심', getMealPlanMenusText(lunchPlan)]);
    
    // 저녁
    const dinnerPlan = getMealPlanForDateAndTime(mealPlans, day, 'dinner');
    wsData.push(['', '저녁', getMealPlanMenusText(dinnerPlan)]);
    
    // 첫 번째 열 셀 병합 (3개 행을 하나로)
    merges.push({
      s: { r: rowIndex, c: 0 },
      e: { r: rowIndex + 2, c: 0 }
    });
    
    rowIndex += 3;
  });
  
  // 워크시트 생성
  const ws = utils.aoa_to_sheet(wsData);
  
  // 셀 병합 적용
  ws['!merges'] = merges;
  
  // 셀 너비 자동 조정
  const colWidths = [13, 10, 60];
  ws['!cols'] = colWidths.map(width => ({ width }));
  
  // 워크북 생성
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, '주간 식단표');
  
  // 파일 이름 생성 (회사명_주간식단표_시작일-종료일.xlsx)
  const startDate = format(daysOfWeek[0], 'yyyyMMdd');
  const endDate = format(daysOfWeek[daysOfWeek.length - 1], 'yyyyMMdd');
  const fileName = `${companyName}_주간식단표_${startDate}-${endDate}.xlsx`;
  
  // 파일 저장
  writeFile(wb, fileName);
};

// 월간 식단표 데이터 생성 (일자별로 정확하게 표시)
export const exportMonthlyMealPlans = (
  weeks: Date[][],
  mealPlans: MealPlan[],
  companyName: string,
  month: number
): void => {
  // 일-토 요일 및 날짜 헤더 배열 생성
  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  
  // 워크시트 데이터 준비
  const wsData: (string | null)[][] = [];
  
  // 1. 헤더 행 추가 (요일)
  wsData.push(['', ...dayHeaders]);
  
  // 2. 날짜 행 배열 구성
  let monthlyRows: (string | null)[][][] = [];
  
  // 각 주에 대해
  weeks.forEach(week => {
    // 이 주의 각 요일에 대한 날짜 데이터
    const dateRow: (string | null)[] = ['날짜'];
    
    // 아침, 점심, 저녁 행
    const breakfastRow: (string | null)[] = ['아침'];
    const lunchRow: (string | null)[] = ['점심'];
    const dinnerRow: (string | null)[] = ['저녁'];
    
    // 각 요일에 대해
    week.forEach(day => {
      // 현재 월에 속하지 않는 날짜는 빈 셀로 처리
      if (day.getMonth() !== month) {
        dateRow.push(null);
        breakfastRow.push(null);
        lunchRow.push(null);
        dinnerRow.push(null);
        return;
      }
      
      // 날짜 표시
      dateRow.push(format(day, 'd')); // 일자만 표시
      
      // 식사별 메뉴 데이터
      const breakfastPlan = getMealPlanForDateAndTime(mealPlans, day, 'breakfast');
      const lunchPlan = getMealPlanForDateAndTime(mealPlans, day, 'lunch');
      const dinnerPlan = getMealPlanForDateAndTime(mealPlans, day, 'dinner');
      
      breakfastRow.push(getMealPlanMenusText(breakfastPlan));
      lunchRow.push(getMealPlanMenusText(lunchPlan));
      dinnerRow.push(getMealPlanMenusText(dinnerPlan));
    });
    
    monthlyRows.push([dateRow, breakfastRow, lunchRow, dinnerRow]);
  });
  
  // 3. 모든 주 데이터를 워크시트 데이터에 추가
  monthlyRows.forEach(weekRows => {
    wsData.push(...weekRows);
    
    // 각 주 사이에 빈 행 추가 (가독성 향상)
    wsData.push(Array(8).fill(null));
  });
  
  // 워크시트 생성
  const ws = utils.aoa_to_sheet(wsData);
  
  // 셀 너비 자동 조정
  const colWidths = [6, 12, 12, 12, 12, 12, 12, 12];
  ws['!cols'] = colWidths.map(width => ({ width }));
  
  // 워크북 생성
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, '월간 식단표');
  
  // 현재 월의 이름 가져오기
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
  
  // 파일 이름 생성 (회사명_월간식단표_연월.xlsx)
  const year = weeks[0][0].getFullYear();
  const fileName = `${companyName}_월간식단표_${year}${(month + 1).toString().padStart(2, '0')}.xlsx`;
  
  // 파일 저장
  writeFile(wb, fileName);
}; 