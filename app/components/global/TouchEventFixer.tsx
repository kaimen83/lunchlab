'use client';

import { useEffect } from 'react';

/**
 * 모바일 터치 디바이스에서 Radix UI Dialog 모달 관련 문제를 해결하는 컴포넌트
 * 
 * GitHub Issues:
 * - https://github.com/radix-ui/primitives/issues/1236
 * - https://github.com/radix-ui/primitives/issues/1241
 * 
 * 이 컴포넌트는 모달이 닫힌 후에도 터치 이벤트가 차단되는 이슈를 해결합니다.
 * 앱의 레이아웃에 이 컴포넌트를 추가하여 모든 페이지에서 모달 관련 문제를 해결할 수 있습니다.
 */
export default function TouchEventFixer() {
  useEffect(() => {
    // 문서 레벨에 이벤트 리스너 추가
    const observer = new MutationObserver(() => {
      // DOM 변경 감지 시 모달 관련 속성 정리
      try {
        checkAndFixDialogIssues();
      } catch (error) {
        // 오류 발생 시 조용히 처리 (React 렌더링에 영향을 주지 않도록)
        console.warn("TouchEventFixer 처리 중 오류 발생:", error);
      }
    });

    // document.body의 자식 노드와 속성 변경 감시
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-state']
    });

    // 정기적으로 검사 (추가 안전장치)
    const intervalId = setInterval(() => {
      try {
        checkAndFixDialogIssues();
      } catch (error) {
        console.warn("TouchEventFixer 인터벌 처리 중 오류 발생:", error);
      }
    }, 1500); // 1.5초마다 체크 (성능 개선)

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  const checkAndFixDialogIssues = () => {
    // data-state="closed" 속성을 가진 다이얼로그만 찾기 (DropdownMenu는 제외)
    const closedDialogs = document.querySelectorAll('[role="dialog"][data-state="closed"]');
    
    if (closedDialogs.length > 0) {
      // 닫힌 다이얼로그가 있으면 문제 해결 로직 실행
      // pointer-events 스타일 제거
      document.body.style.pointerEvents = '';
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
      
      // aria-hidden 속성 제거 - 안전하게 처리 (dialog 관련 요소만 대상으로)
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        try {
          // DropdownMenu 관련 요소는 건드리지 않음
          if (el instanceof HTMLElement && 
              !el.dataset.permanent && 
              document.body.contains(el) &&
              !el.closest('[role="menu"]') && // DropdownMenu 요소 제외
              !el.hasAttribute('data-radix-menu-content')) { // Radix 메뉴 콘텐츠 제외
            el.removeAttribute('aria-hidden');
          }
        } catch (error) {
          // 속성 제거 중 오류 발생 시 무시
        }
      });
      
      // Dialog 관련 오버레이 요소만 제거 (DropdownMenu는 제외)
      const overlays = document.querySelectorAll('[data-radix-popper-content-wrapper]');
      overlays.forEach(overlay => {
        try {
          // DropdownMenu 관련 요소는 건드리지 않음
          const isMenuElement = 
            overlay.querySelector('[role="menu"]') || 
            overlay.hasAttribute('data-radix-menu-content') ||
            overlay.getAttribute('data-state') === 'open';
          
          // 요소가 DOM에 있고 메뉴 요소가 아닌 경우에만 제거
          if (overlay.parentNode && 
              document.body.contains(overlay) && 
              !isMenuElement) {
            overlay.parentNode.removeChild(overlay);
          }
        } catch (error) {
          // 노드 제거 중 오류 발생 시 무시
        }
      });
      
      // 불필요한 data-state="closed" 다이얼로그 정리 - 안전하게 처리
      closedDialogs.forEach(dialog => {
        try {
          // DropdownMenu 관련 요소는 제외하고 다이얼로그만 대상으로
          const isDialogElement = 
            dialog.getAttribute('role') === 'dialog' &&
            !dialog.closest('[role="menu"]') && 
            !dialog.hasAttribute('data-radix-menu-content');
          
          // 요소가 실제로 DOM에 존재하는지 확인
          if (dialog.parentElement && 
              document.body.contains(dialog) && 
              isDialogElement &&
              dialog.getAttribute('data-remove-on-close') === 'true') {
            dialog.parentElement.removeChild(dialog);
          }
        } catch (error) {
          // 제거 중 오류 발생 시 무시
        }
      });
    }
  };

  return null; // UI를 렌더링하지 않음
} 