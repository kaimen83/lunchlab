import { useState, useEffect } from 'react';

/**
 * 입력 값의 변경을 지연시키는 훅
 * @param value 디바운스할 값
 * @param delay 디바운스 지연 시간 (밀리초)
 * @returns 디바운스된 값
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 지정된 지연 시간 후에 값을 업데이트
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 다음 변경이 발생하면 타이머를 취소
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
} 