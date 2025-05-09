import React from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, Menu, Calendar, CalendarDays, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ViewType } from '../types';

interface CalendarHeaderProps {
  viewType: ViewType;
  currentWeek: Date;
  onViewTypeChange: (value: ViewType) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
  onExportToExcel: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewType,
  currentWeek,
  onViewTypeChange,
  onPreviousPeriod,
  onNextPeriod,
  onToday,
  onExportToExcel
}) => {
  // 현재 주의 시작일과 종료일
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // 현재 표시 중인 기간 텍스트
  const periodText = viewType === 'week'
    ? `${format(weekStart, 'M월 d일')} - ${format(weekEnd, 'M월 d일')}`
    : format(currentWeek, 'yyyy년 M월');

  return (
    <div className="flex flex-col mb-6 gap-4">
      {/* 제목 및 기본 컨트롤 영역 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">식단 관리</h1>
        
        {/* PC에서는 표시, 모바일에서는 숨김 */}
        <div className="hidden md:flex items-center gap-4">
          <Tabs value={viewType} onValueChange={(value) => onViewTypeChange(value as ViewType)}>
            <TabsList className="bg-gray-100 rounded-md p-1">
              <TabsTrigger value="week" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">주간</TabsTrigger>
              <TabsTrigger value="month" className="rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">월간</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={onPreviousPeriod} aria-label="Previous period" className="rounded-md shadow-sm hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onToday} aria-label="Today" className="rounded-md shadow-sm hover:bg-gray-100">
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onNextPeriod} aria-label="Next period" className="rounded-md shadow-sm hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 내보내기 버튼 */}
            <Button
              variant="secondary"
              className="h-9 text-xs md:text-sm shadow-sm hover:bg-gray-100"
              onClick={onExportToExcel}
            >
              <Download className="mr-1 h-4 w-4" />
              <span>내보내기</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* 모바일 전용 컨트롤 영역 */}
      <div className="md:hidden">
        {/* 현재 기간 및 네비게이션 */}
        <div className="flex items-center justify-between mb-3 bg-gray-50 rounded-md border p-3">
          <Button variant="ghost" size="icon" onClick={onPreviousPeriod} className="h-8 w-8 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={onToday} className="text-sm font-medium hover:bg-gray-100 rounded-md">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              <span>{periodText}</span>
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onNextPeriod} className="h-8 w-8 hover:bg-gray-100 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 보기 타입 전환 */}
        <Tabs 
          value={viewType} 
          onValueChange={(value) => onViewTypeChange(value as ViewType)}
          className="w-full"
        >
          <TabsList className="w-full bg-gray-100 rounded-md p-1">
            <TabsTrigger value="week" className="flex-1 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">주간 보기</TabsTrigger>
            <TabsTrigger value="month" className="flex-1 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">월간 보기</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};

export default CalendarHeader; 