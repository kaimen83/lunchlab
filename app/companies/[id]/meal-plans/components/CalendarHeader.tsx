import React from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ViewType } from '../types';

interface CalendarHeaderProps {
  viewType: ViewType;
  currentWeek: Date;
  onViewTypeChange: (value: ViewType) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewType,
  currentWeek,
  onViewTypeChange,
  onPreviousPeriod,
  onNextPeriod,
  onToday
}) => {
  // 현재 주의 시작일과 종료일
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <h1 className="text-3xl font-bold tracking-tight">식단 관리</h1>
      
      <div className="flex items-center gap-4">
        <Tabs value={viewType} onValueChange={(value) => onViewTypeChange(value as ViewType)}>
          <TabsList>
            <TabsTrigger value="week">주간</TabsTrigger>
            <TabsTrigger value="month">월간</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousPeriod} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onToday} aria-label="Today">
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextPeriod} aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader; 