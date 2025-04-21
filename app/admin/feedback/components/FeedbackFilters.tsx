"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface FeedbackFiltersProps {
  statusFilter: string | null
  onStatusFilterChange: (status: string | null) => void
  onRefresh: () => void
  dateFilter: Date | null
  onDateFilterChange: (date: Date | null) => void
}

export default function FeedbackFilters({
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  dateFilter,
  onDateFilterChange
}: FeedbackFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 상태 필터 */}
        <Tabs
          value={statusFilter || "all"}
          onValueChange={(value) => onStatusFilterChange(value === "all" ? null : value)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-1">
              읽지 않음
            </TabsTrigger>
            <TabsTrigger value="read">검토중</TabsTrigger>
            <TabsTrigger value="replied">답변완료</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 날짜 필터 */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter ? "default" : "outline"}
              className={cn(
                "justify-start text-left font-normal sm:w-[200px]",
                !dateFilter && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? (
                format(dateFilter, "PPP", { locale: ko })
              ) : (
                <span>날짜 선택</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter || undefined}
              onSelect={(date) => {
                onDateFilterChange(date || null)
                setCalendarOpen(false)
              }}
              initialFocus
            />
            <div className="p-3 border-t border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center"
                onClick={() => {
                  onDateFilterChange(null)
                  setCalendarOpen(false)
                }}
              >
                필터 초기화
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 새로고침 버튼 */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        className="gap-1"
      >
        <RefreshCw className="h-4 w-4" />
        <span>새로고침</span>
      </Button>
    </div>
  )
} 