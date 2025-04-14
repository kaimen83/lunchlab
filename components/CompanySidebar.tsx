'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './sidebar/SidebarContent';
import { CompanySidebarProps } from './sidebar/types';

export function CompanySidebar({ companies, isMobile = false }: CompanySidebarProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 모바일 뷰
  if (isMobile) {
    // 모바일 헤더 (축소된 메뉴 표시)
    return (
      <div className="bg-[#19171D] text-white p-2">
        <div className="flex items-center justify-between">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-gray-700 rounded">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-[#19171D] border-r border-gray-700 w-[280px] sm:w-[320px]" closeButton={false}>
              <SidebarContent 
                companies={companies} 
                isMobile={true} 
                isSheetOpen={isSheetOpen}
                setIsSheetOpen={setIsSheetOpen}
              />
            </SheetContent>
          </Sheet>
          
          <Link href="/" className="text-white font-bold text-xl mx-auto">
            LunchLab
          </Link>
          
          <div className="w-10"></div> {/* 더보기 버튼과 균형을 맞추기 위한 빈 공간 */}
        </div>
      </div>
    );
  }

  // 데스크톱 뷰
  return <SidebarContent companies={companies} isMobile={false} />;
} 