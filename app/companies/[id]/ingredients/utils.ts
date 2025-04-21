// 유틸리티 함수

/**
 * 통화 형식으로 금액 포맷팅
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
};

/**
 * 숫자 포맷팅 (천 단위 구분)
 */
export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('ko-KR').format(number);
};

/**
 * 가격 포맷팅 (문자열 -> 숫자)
 */
export const formatPrice = (price: string | number): string => {
  if (typeof price === 'string') {
    // 문자열에서 숫자가 아닌 문자 제거
    const numericString = price.replace(/[^0-9]/g, '');
    return numericString === '' ? '0' : numericString;
  }
  
  // 숫자인 경우 문자열로 변환
  return price.toString();
};

/**
 * 폼 데이터 정리 함수
 * null이나 빈 문자열 등의 값을 정리하여 서버로 전송할 데이터 형태로 변환
 */
export const cleanFormData = (data: any): any => {
  const cleanedData: any = { ...data };
  
  // null, undefined 또는 빈 문자열인 경우 null로 설정
  Object.keys(cleanedData).forEach(key => {
    if (cleanedData[key] === null || cleanedData[key] === undefined || cleanedData[key] === '') {
      cleanedData[key] = null;
    }
  });
  
  // 숫자 값들이 문자열로 들어온 경우 숫자로 변환
  const numericFields = ['price', 'package_amount', 'items_per_box', 'calories', 'protein', 'fat', 'carbs'];
  numericFields.forEach(field => {
    if (cleanedData[field] !== null) {
      cleanedData[field] = Number(cleanedData[field]);
    }
  });
  
  return cleanedData;
};

/**
 * 식재료 등급에 따른 배지 스타일 결정
 */
export const getStockGradeVariant = (stockGrade?: string): "default" | "secondary" | "outline" | "destructive" => {
  if (!stockGrade) return "outline";
  
  switch(stockGrade) {
    case 'A': return "default";
    case 'B': return "secondary";
    case 'C': return "outline";
    default: return "destructive";
  }
}; 