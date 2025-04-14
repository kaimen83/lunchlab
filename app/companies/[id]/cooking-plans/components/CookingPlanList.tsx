'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, FileText, FilePlus, Trash2, FileEdit, X } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import CookingPlanContainer from './CookingPlanContainer';

// 식사 시간 한글화
const getMealTimeName = (mealTime: string) => {
  switch (mealTime) {
    case 'breakfast': return '아침';
    case 'lunch': return '점심';
    case 'dinner': return '저녁';
    default: return mealTime;
  }
};

interface CookingPlanListProps {
  companyId: string;
}

interface CookingPlanSummary {
  date: string;
  meal_times: string[];
  total_headcount: number;
}

export default function CookingPlanList({ companyId }: CookingPlanListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cookingPlans, setCookingPlans] = useState<CookingPlanSummary[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [filterStartDate, setFilterStartDate] = useState<Date>(subDays(new Date(), 30));
  const [filterEndDate, setFilterEndDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  
  // 캘린더 컨테이너에 대한 참조
  const calendarRef = useRef<HTMLDivElement>(null);
  // 캘린더 버튼에 대한 참조
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  
  // 현재 컴포넌트가 마운트된 상태인지 추적
  const isMountedRef = useRef<boolean>(true);
  
  useEffect(() => {
    // 컴포넌트 마운트 시 설정
    isMountedRef.current = true;
    
    // 캘린더 외부 클릭 감지 핸들러
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) && 
        calendarButtonRef.current && 
        !calendarButtonRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('mousedown', handleClickOutside);
    
    // 컴포넌트 언마운트 시 클린업 함수
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 탭 변경 시 캘린더 상태 초기화
  useEffect(() => {
    if (activeTab !== 'list') {
      setShowCalendar(false);
    }
  }, [activeTab]);
  
  useEffect(() => {
    fetchCookingPlans();
  }, [companyId, filterStartDate, filterEndDate]);
  
  const fetchCookingPlans = async () => {
    setIsLoading(true);
    try {
      const startDateStr = format(filterStartDate, 'yyyy-MM-dd');
      const endDateStr = format(filterEndDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/companies/${companyId}/cooking-plans?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      
      if (!response.ok) {
        throw new Error('조리계획서 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setCookingPlans(data);
    } catch (error) {
      console.error('조리계획서 목록 조회 오류:', error);
      toast({
        title: '조리계획서 목록 조회 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewCookingPlan = (date: string) => {
    router.push(`/companies/${companyId}/cooking-plans/${date}`);
  };
  
  const handleCreateNewClick = () => {
    setActiveTab('create');
  };
  
  const handleDeleteCookingPlan = async () => {
    if (!deletingDate) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/cooking-plans?date=${deletingDate}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('조리계획서 삭제에 실패했습니다.');
      }
      
      toast({
        title: '조리계획서 삭제 완료',
        description: `${deletingDate} 조리계획서가 삭제되었습니다.`,
      });
      
      // 목록 새로고침
      fetchCookingPlans();
    } catch (error) {
      console.error('조리계획서 삭제 오류:', error);
      toast({
        title: '조리계획서 삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setDeletingDate(null);
    }
  };
  
  const handleFilterThisMonth = () => {
    const now = new Date();
    setFilterStartDate(startOfMonth(now));
    setFilterEndDate(endOfMonth(now));
  };
  
  const handleFilterLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setFilterStartDate(startOfMonth(lastMonth));
    setFilterEndDate(endOfMonth(lastMonth));
  };
  
  // 캘린더 선택 처리
  const handleCalendarSelect = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    if (!range || !isMountedRef.current) return;
    
    if (range.from) setFilterStartDate(range.from);
    if (range.to) setFilterEndDate(range.to);
    
    // 캘린더 닫기
    setTimeout(() => {
      if (isMountedRef.current) {
        setShowCalendar(false);
      }
    }, 10);
  }, [isMountedRef]);
  
  // 캘린더 토글
  const toggleCalendar = useCallback(() => {
    setShowCalendar(prev => !prev);
  }, []);
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => {
        // 탭 변경 전에 캘린더 닫기
        setShowCalendar(false);
        setActiveTab(value);
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">조리계획서 목록</TabsTrigger>
          <TabsTrigger value="create">새 조리계획서 작성</TabsTrigger>
        </TabsList>
        
        {/* 조리계획서 목록 */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>조리계획서 목록</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleFilterThisMonth}>
                    이번 달
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFilterLastMonth}>
                    지난 달
                  </Button>
                  <div className="relative">
                    <Button 
                      ref={calendarButtonRef}
                      variant="outline" 
                      size="sm" 
                      onClick={toggleCalendar}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      날짜 선택
                    </Button>
                    
                    {showCalendar && (
                      <div 
                        ref={calendarRef} 
                        className="absolute z-50 right-0 mt-2 bg-white border rounded-md shadow-md"
                      >
                        <div className="flex justify-between items-center p-2 border-b">
                          <span className="text-sm font-medium">날짜 범위 선택</span>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setShowCalendar(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Calendar
                          mode="range"
                          selected={{
                            from: filterStartDate,
                            to: filterEndDate
                          }}
                          onSelect={handleCalendarSelect}
                          locale={ko}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">조리계획서 목록을 불러오는 중...</p>
              ) : cookingPlans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">조리계획서가 없습니다.</p>
                  <Button onClick={handleCreateNewClick}>
                    <FilePlus className="mr-2 h-4 w-4" />
                    새 조리계획서 작성
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>식사 시간</TableHead>
                      <TableHead className="text-right">총 식수</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cookingPlans.map((plan) => (
                      <TableRow key={plan.date}>
                        <TableCell>
                          {format(new Date(plan.date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                        </TableCell>
                        <TableCell>
                          {plan.meal_times.map(meal => getMealTimeName(meal)).join(', ')}
                        </TableCell>
                        <TableCell className="text-right">
                          {plan.total_headcount}명
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewCookingPlan(plan.date)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedDate(new Date(plan.date));
                                setActiveTab('create');
                              }}
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDeletingDate(plan.date);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 새 조리계획서 작성 */}
        <TabsContent value="create">
          <CookingPlanContainer 
            companyId={companyId} 
            initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
            onComplete={() => {
              // 탭 전환 전에 모든 캘린더 상태 초기화
              setShowCalendar(false);
              setActiveTab('list');
              setSelectedDate(null);
              fetchCookingPlans();
            }}
          />
        </TabsContent>
      </Tabs>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>조리계획서 삭제</DialogTitle>
            <DialogDescription>
              {deletingDate && 
                `${format(new Date(deletingDate), 'yyyy년 MM월 dd일', { locale: ko })} 날짜의 조리계획서를 삭제하시겠습니까?`
              }
              <br />이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCookingPlan} disabled={isLoading}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 