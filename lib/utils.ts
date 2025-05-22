import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜 문자열을 형식화하는 함수
 * @param dateString - 날짜 문자열 또는 Date 객체
 * @returns 형식화된 날짜 문자열
 */
export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
