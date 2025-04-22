'use client';

import { useState, useEffect, RefObject, KeyboardEvent as ReactKeyboardEvent } from 'react';

interface FlattenedItem {
  id: string;
  idx: number;
}

/**
 * 식재료 목록 키보드 탐색을 위한 커스텀 훅
 */
export function useIngredientKeyboardNavigation(
  flattenedItems: FlattenedItem[],
  sheetOpen: boolean,
  searchInputRef: RefObject<HTMLInputElement>,
  onIngredientSelect: (id: string) => void,
  onSheetOpenChange: (open: boolean) => void
) {
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  const [focusedGroupIndex, setFocusedGroupIndex] = useState<number>(0);

  // 리스트 아이템 키보드 이벤트 처리
  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
    if (flattenedItems.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (focusedItemIndex < flattenedItems.length - 1) {
          // 다음 아이템으로 이동
          setFocusedItemIndex(focusedItemIndex + 1);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (focusedItemIndex > 0) {
          // 이전 아이템으로 이동
          setFocusedItemIndex(focusedItemIndex - 1);
        } else {
          // 첫 번째 아이템에서 위로 이동 시 검색창으로 포커스 이동
          setFocusedItemIndex(-1);
          searchInputRef.current?.focus();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (focusedItemIndex >= 0 && focusedItemIndex < flattenedItems.length) {
          // 선택한 아이템의 ID로 선택 처리
          const selected = flattenedItems[focusedItemIndex];
          onIngredientSelect(selected.id);
        }
        break;
        
      case 'Tab':
        if (e.shiftKey) {
          e.preventDefault();
          setFocusedItemIndex(-1);
          searchInputRef.current?.focus();
        }
        break;
        
      case 'Escape':
        onSheetOpenChange(false);
        break;
    }
  };

  // 글로벌 키보드 이벤트 리스너
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!sheetOpen) return;
      
      // 다른 요소가 포커스 중일 때는 이벤트 무시
      const activeElement = document.activeElement;
      if (activeElement === searchInputRef.current) return;
      
      // 필요한 키 처리
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
        e.preventDefault();
        
        // Enter 키를 눌렀을 때 직접 handleIngredientSelect 호출
        if (e.key === 'Enter' && focusedItemIndex >= 0 && focusedItemIndex < flattenedItems.length) {
          const selected = flattenedItems[focusedItemIndex];
          onIngredientSelect(selected.id);
          return;
        }
        
        // 다른 키는 handleListKeyDown으로 위임
        handleListKeyDown(e);
      }
    };
    
    if (sheetOpen) {
      window.addEventListener('keydown', handleGlobalKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [sheetOpen, focusedItemIndex, flattenedItems, handleListKeyDown, onIngredientSelect]);

  // 시트 열림/닫힘 상태에 따른 포커스 처리
  useEffect(() => {
    if (!sheetOpen) {
      setFocusedItemIndex(-1);
      setFocusedGroupIndex(0);
    } else {
      // 시트가 열렸을 때 검색 필드에 포커스
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [sheetOpen, searchInputRef]);

  return {
    focusedItemIndex,
    setFocusedItemIndex,
    focusedGroupIndex,
    setFocusedGroupIndex,
    handleListKeyDown
  };
} 