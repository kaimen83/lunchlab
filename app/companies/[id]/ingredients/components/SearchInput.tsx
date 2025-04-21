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
    
    inputTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 500);
  };
  
  // 엔터 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
        inputTimeoutRef.current = null;
      }
      onChange(inputValue);
      onSearch();
    }
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="relative flex-1 sm:max-w-md">
      <div className="flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="식재료 검색..." 
            className="pl-9 pr-14"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 top-0 h-full"
              onClick={() => {
                setInputValue('');
                onChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button 
          variant="secondary"
          className="ml-2"
          onClick={onSearch}
        >
          검색
        </Button>
      </div>
      <div className="mt-1 text-xs text-muted-foreground ml-1">
        {totalCount !== undefined && totalCount > 0 && (
          <span>전체 {totalCount}건</span>
        )}
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput; 