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
import CookingPlanForm from './CookingPlanForm';
import { CookingPlanFormData } from '../types';

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
  
  // 수정 모달 관련 상태
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
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
  
  // 조리계획서 수정 모달 열기
  const handleEditCookingPlan = (date: string) => {
    setEditingDate(date);
    setShowEditModal(true);
  };
  
  // 조리계획서 수정 처리
  const handleEditFormSubmit = async (data: CookingPlanFormData) => {
    setIsEditing(true);
    
    try {
      // 수정 API 호출
      const response = await fetch(`/api/companies/${companyId}/cooking-plans`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '조리계획서 수정 중 오류가 발생했습니다.');
      }
      
      // 목록 새로고침
      fetchCookingPlans();
      
      // 모달 닫기
      setShowEditModal(false);
      setEditingDate(null);
      
      toast({
        title: '조리계획서 수정 완료',
        description: `${data.date} 조리계획서가 수정되었습니다.`,
      });
    } catch (error) {
      console.error('조리계획서 수정 오류:', error);
      toast({
        title: '조리계획서 수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
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
    <div className="space-y-4 md:space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => {
        // 탭 변경 전에 캘린더 닫기
        setShowCalendar(false);
        setActiveTab(value);
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">조리계획서 목록</TabsTrigger>
          <TabsTrigger value="create">새 작성</TabsTrigger>
        </TabsList>
        
        {/* 조리계획서 목록 */}
        <TabsContent value="list" className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0">
                <CardTitle className="text-base md:text-xl">조리계획서 목록</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleFilterThisMonth} className="text-xs md:text-sm h-8 md:h-9">
                    이번 달
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleFilterLastMonth} className="text-xs md:text-sm h-8 md:h-9">
                    지난 달
                  </Button>
                  <div className="relative">
                    <Button 
                      ref={calendarButtonRef}
                      variant="outline" 
                      size="sm" 
                      onClick={toggleCalendar}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      <CalendarIcon className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                      날짜 선택
                    </Button>
                    
                    {showCalendar && (
                      <div 
                        ref={calendarRef} 
                        className="absolute z-50 right-0 mt-2 bg-white border rounded-md shadow-md w-[280px] md:w-auto"
                      >
                        <div className="flex justify-between items-center p-2 border-b">
                          <span className="text-xs md:text-sm font-medium">날짜 범위 선택</span>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 md:h-8 md:w-8 p-0"
                            onClick={() => setShowCalendar(false)}
                          >
                            <X className="h-3 w-3 md:h-4 md:w-4" />
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
                          className="rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              {isLoading ? (
                <p className="text-center text-gray-500 py-6 md:py-8">조리계획서 목록을 불러오는 중...</p>
              ) : cookingPlans.length === 0 ? (
                <div className="text-center py-6 md:py-8">
                  <p className="text-gray-500 mb-4">조리계획서가 없습니다.</p>
                  <Button onClick={handleCreateNewClick} size="sm" className="md:size-md">
                    <FilePlus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    새 조리계획서 작성
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 md:mx-0">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-xs md:text-sm">날짜</TableHead>
                        <TableHead className="whitespace-nowrap text-xs md:text-sm">식사 시간</TableHead>
                        <TableHead className="text-right whitespace-nowrap text-xs md:text-sm">총 식수</TableHead>
                        <TableHead className="text-right whitespace-nowrap text-xs md:text-sm">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cookingPlans.map((plan) => (
                        <TableRow key={plan.date} className="text-xs md:text-sm">
                          <TableCell className="py-2 md:py-3">
                            <span className="hidden md:inline">{format(new Date(plan.date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
                            <span className="md:hidden">{format(new Date(plan.date), 'MM/dd (EEE)', { locale: ko })}</span>
                          </TableCell>
                          <TableCell className="py-2 md:py-3">
                            {plan.meal_times.map(meal => getMealTimeName(meal)).join(', ')}
                          </TableCell>
                          <TableCell className="text-right py-2 md:py-3">
                            {plan.total_headcount}명
                          </TableCell>
                          <TableCell className="text-right py-2 md:py-3">
                            <div className="flex justify-end space-x-1 md:space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-7 w-7 md:h-8 md:w-8"
                                onClick={() => handleViewCookingPlan(plan.date)}
                              >
                                <FileText className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-7 w-7 md:h-8 md:w-8"
                                onClick={() => handleEditCookingPlan(plan.date)}
                              >
                                <FileEdit className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-7 w-7 md:h-8 md:w-8"
                                onClick={() => {
                                  setDeletingDate(plan.date);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
        <DialogContent className="w-[90vw] max-w-md">
          <DialogHeader>
            <DialogTitle>조리계획서 삭제</DialogTitle>
            <DialogDescription>
              {deletingDate && 
                `${format(new Date(deletingDate), 'yyyy년 MM월 dd일', { locale: ko })} 날짜의 조리계획서를 삭제하시겠습니까?`
              }
              <br />이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto">
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCookingPlan} disabled={isLoading} className="w-full sm:w-auto">
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 수정 모달 */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) setEditingDate(null);
      }}>
        <DialogContent className="w-[90vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>조리계획서 수정</DialogTitle>
            <DialogDescription>
              {editingDate && 
                `${format(new Date(editingDate), 'yyyy년 MM월 dd일', { locale: ko })} 조리계획서를 수정합니다.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {editingDate && (
            <div className="py-2 md:py-4">
              <CookingPlanForm
                companyId={companyId}
                initialDate={editingDate}
                onSubmit={handleEditFormSubmit}
                isEditing={true}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto">
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 