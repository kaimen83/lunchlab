/**
 * 수량을 단위에 따라 적절한 형식으로 포맷팅합니다.
 * EA 또는 개 단위는 소수점 없이, g은 kg로, ml은 l로 변환하여 소수점 첫째자리까지 표시합니다.
 */
export function formatQuantity(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return "-";
  
  // EA 또는 개 단위는 소수점 없이 표시
  if (unit === "EA" || unit === "개") {
    return Math.round(value).toLocaleString("ko-KR");
  }
  
  // g을 kg로 변환
  if (unit === "g") {
    const convertedValue = value / 1000;
    return convertedValue.toLocaleString("ko-KR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
  
  // ml을 l로 변환
  if (unit === "ml") {
    const convertedValue = value / 1000;
    return convertedValue.toLocaleString("ko-KR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
  
  // 다른 단위는 소수점 첫째자리까지 표시
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
} 