'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInputProps } from '../types';

// 검색 입력 컴포넌트 분리 (메모이제이션)
const SearchInput = React.memo(({ 
  value, 
  onChange, 
  onSearch,
  totalCount
}: SearchInputProps) => {
  // 로컬 입력값 상태
  const [inputValue, setInputValue] = useState(value);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 외부 value prop 변경 시 내부 상태 동기화
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // 입력 핸들러
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // 즉시 로컬 상태 업데이트 (타이핑 반응성 유지)
    
    // 상위 컴포넌트 상태 업데이트는 디바운스 적용
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    
    // 디바운스 시간을 300ms로 줄여 반응성 개선 (모바일 환경에서 더 부드러운 경험)
    inputTimeoutRef.current = setTimeout(() => {
      // 부모 컴포넌트로 값 변경 전달
      onChange(newValue);
    }, 300);
  };
  
  // 엔터 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // 기본 동작 방지 (모바일에서 더 안정적)
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
        inputTimeoutRef.current = null;
      }
      onChange(inputValue);
      onSearch();
    }
  };
  
  // 검색 버튼 핸들러 - 명시적으로 분리하여 모바일 터치 이벤트 안정화
  const handleSearchClick = () => {
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
      inputTimeoutRef.current = null;
    }
    onChange(inputValue);
    onSearch();
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, []);
  
  // 입력창 지우기 핸들러
  const handleClearInput = () => {
    setInputValue('');
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    // 바로 부모에게 변경 알림
    onChange('');
  };
  
  return (
    <div className="relative flex-1 sm:max-w-md">
      <form 
        className="flex" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSearchClick();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="식재료 검색..." 
            className="pl-9 pr-14"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 top-0 h-full"
              onClick={handleClearInput}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button 
          variant="secondary"
          className="ml-2"
          onClick={handleSearchClick}
          type="submit"
        >
          검색
        </Button>
      </form>
      <div className="mt-1 text-xs text-muted-foreground ml-1">
        {totalCount !== undefined && (
          <span>전체 {totalCount}건</span>
        )}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput; 