'use client';

import { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// 경로 컨텍스트 생성
const PathContext = createContext<string | null>(null);

// 경로 컨텍스트 훅
export const usePath = () => {
  const context = useContext(PathContext);
  return context;
};

// 경로 제공자 컴포넌트
export function PathProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  return (
    <PathContext.Provider value={pathname}>
      {children}
    </PathContext.Provider>
  );
} 