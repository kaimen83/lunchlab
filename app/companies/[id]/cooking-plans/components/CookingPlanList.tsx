'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, compareAsc, compareDesc } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, 
  FileText, 
  FilePlus, 
  Trash2, 
  FileEdit, 
  X, 
  Filter,
  Search,
  Plus,
  ChevronDown,
  Download,
  Calendar,
  Clock
} from 'lucide-react';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import CookingPlanContainer from './CookingPlanContainer';
import CookingPlanForm from './CookingPlanForm';
import { CookingPlanFormData } from '../types';
import { Badge } from '@/components/ui/badge';

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

// 정렬 방향 타입 정의
type SortDirection = 'asc' | 'desc';

export default function CookingPlanList({ companyId }: CookingPlanListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cookingPlans, setCookingPlans] = useState<CookingPlanSummary[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  
  // 정렬 관련 상태 추가
  const [sortField, setSortField] = useState<'date' | null>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // 필터 관련 상태 및 설정
  // ---------------------------------------------
  // 필터 기본값을 이번 주로 설정 (월요일 ~ 일요일)
  const now = new Date();
  const [filterStartDate, setFilterStartDate] = useState<Date>(startOfWeek(now, { weekStartsOn: 1 }));
  const [filterEndDate, setFilterEndDate] = useState<Date>(endOfWeek(now, { weekStartsOn: 1 }));
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  // ---------------------------------------------
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  
  // 검색 필터링을 위한 상태
  const [searchTerm, setSearchTerm] = useState<string>('');
  
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
  
  // ===== 필터 관련 유틸리티 함수 =====
  
  // 이번 주 필터 핸들러
  const handleFilterThisWeek = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    setFilterStartDate(weekStart);
    setFilterEndDate(weekEnd);
    
    // 필터 적용 알림
    toast({
      title: '필터 적용',
      description: '이번 주 데이터만 표시합니다.',
      variant: 'default',
    });
  };
  
  // 다음 주 필터 핸들러
  const handleFilterNextWeek = () => {
    const now = new Date();
    // 현재 날짜에 7일을 더해 다음 주의 동일한 요일 얻기
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    
    const weekStart = startOfWeek(nextWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 });
    
    setFilterStartDate(weekStart);
    setFilterEndDate(weekEnd);
    
    // 필터 적용 알림
    toast({
      title: '필터 적용',
      description: '다음 주 데이터만 표시합니다.',
      variant: 'default',
    });
  };
  
  // 이번 달 필터 핸들러
  const handleFilterThisMonth = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    setFilterStartDate(monthStart);
    setFilterEndDate(monthEnd);
    
    // 필터 적용 알림
    toast({
      title: '필터 적용',
      description: '이번 달 데이터만 표시합니다.',
      variant: 'default',
    });
  };
  
  // 캘린더 토글
  const toggleCalendar = useCallback(() => {
    setShowCalendar(prev => !prev);
  }, []);
  
  // 캘린더 선택 처리
  const handleCalendarSelect = useCallback((range: { from?: Date; to?: Date } | undefined) => {
    if (!range || !isMountedRef.current) return;
    
    if (range.from) setFilterStartDate(range.from);
    if (range.to) setFilterEndDate(range.to);
    
    // 사용자 정의 필터 적용 알림
    if (range.from && range.to) {
      toast({
        title: '필터 적용',
        description: `${format(range.from, 'yyyy.MM.dd')} ~ ${format(range.to, 'yyyy.MM.dd')} 기간의 데이터만 표시합니다.`,
        variant: 'default',
      });
    }
    
    // 캘린더 닫기
    setTimeout(() => {
      if (isMountedRef.current) {
        setShowCalendar(false);
      }
    }, 10);
  }, [isMountedRef, toast]);
  
  // 정렬 처리 함수
  const handleSort = (field: 'date') => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭한 경우 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭한 경우 해당 필드로 정렬 필드 변경하고 기본 방향은 오름차순
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬된 조리계획서 목록 계산
  const sortedCookingPlans = useMemo(() => {
    // 검색어로 필터링된 목록 가져오기
    const filtered = cookingPlans.filter(plan => {
      if (!searchTerm.trim()) return true;
      
      const searchTermLower = searchTerm.toLowerCase();
      const dateStr = format(new Date(plan.date), 'yyyy년 MM월 dd일', { locale: ko });
      const mealTimesStr = plan.meal_times.map(meal => getMealTimeName(meal)).join(' ');
      
      return (
        dateStr.includes(searchTermLower) ||
        mealTimesStr.toLowerCase().includes(searchTermLower) ||
        plan.total_headcount.toString().includes(searchTermLower)
      );
    });
    
    // 정렬 적용
    if (sortField === 'date') {
      return [...filtered].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        return sortDirection === 'asc' 
          ? compareAsc(dateA, dateB)
          : compareDesc(dateA, dateB);
      });
    }
    
    return filtered;
  }, [cookingPlans, searchTerm, sortField, sortDirection]);
  
  // 현재 적용된 필터가 이번 주인지 확인하는 함수
  const isThisWeekFilter = () => {
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return isSameDay(filterStartDate, thisWeekStart) && isSameDay(filterEndDate, thisWeekEnd);
  };
  
  // 현재 적용된 필터가 이번 달인지 확인하는 함수
  const isThisMonthFilter = () => {
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    
    return isSameDay(filterStartDate, thisMonthStart) && isSameDay(filterEndDate, thisMonthEnd);
  };
  
  // 현재 적용된 필터가 다음 주인지 확인하는 함수
  const isNextWeekFilter = () => {
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStart = startOfWeek(nextWeek, { weekStartsOn: 1 });
    const nextWeekEnd = endOfWeek(nextWeek, { weekStartsOn: 1 });
    
    return isSameDay(filterStartDate, nextWeekStart) && isSameDay(filterEndDate, nextWeekEnd);
  };
  
  return (
    <div className="p-0">
      <Tabs value={activeTab} onValueChange={(value) => {
        setShowCalendar(false);
        setActiveTab(value);
      }} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 pt-4 pb-2">
          <TabsList className="grid w-full sm:w-80 grid-cols-2 h-10 mb-2 sm:mb-0">
            <TabsTrigger value="list" className="rounded-md">
              목록 보기
            </TabsTrigger>
            <TabsTrigger value="create" className="rounded-md">
              새 작성
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'list' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="검색..."
                  className="pl-9 h-9 text-sm focus-visible:ring-1 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <Filter className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">
                        필터: {
                          isThisWeekFilter()
                            ? '이번 주'
                            : isNextWeekFilter()
                              ? '다음 주'
                              : isThisMonthFilter()
                                ? '이번 달'
                                : '사용자 지정'
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={handleFilterThisWeek} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          이번 주
                        </div>
                        {isThisWeekFilter() && (
                          <Badge variant="outline" className="ml-2 h-5 bg-blue-50 text-blue-600 text-[10px] px-1.5">
                            선택됨
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleFilterNextWeek} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          다음 주
                        </div>
                        {isNextWeekFilter() && (
                          <Badge variant="outline" className="ml-2 h-5 bg-blue-50 text-blue-600 text-[10px] px-1.5">
                            선택됨
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleFilterThisMonth} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          이번 달
                        </div>
                        {isThisMonthFilter() && (
                          <Badge variant="outline" className="ml-2 h-5 bg-blue-50 text-blue-600 text-[10px] px-1.5">
                            선택됨
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleCalendar}>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          날짜 범위 선택
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  onClick={handleCreateNewClick} 
                  size="sm" 
                  className="h-9"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">새 작성</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* 캘린더 팝오버 */}
        {showCalendar && (
          <div 
            ref={calendarRef} 
            className="absolute z-50 right-4 sm:right-6 mt-2 bg-white border rounded-md shadow-md w-[calc(100%-2rem)] sm:w-[280px] md:w-auto"
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
            <CalendarComponent
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
            <div className="p-2 text-xs text-muted-foreground border-t">
              <p>시작일과 종료일을 선택하여 사용자 지정 기간을 설정할 수 있습니다.</p>
            </div>
          </div>
        )}
        
        {/* 조리계획서 목록 */}
        <TabsContent value="list" className="m-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                <p className="mt-4 text-sm text-gray-500">조리계획서 목록을 불러오는 중...</p>
              </div>
            </div>
          ) : sortedCookingPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 h-64 text-center">
              <div className="bg-blue-50 rounded-full p-3 mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">조리계획서가 없습니다</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                {searchTerm ? 
                  '검색 조건에 맞는 조리계획서가 없습니다. 다른 검색어를 시도해보세요.' : 
                  '선택한 기간에 생성된 조리계획서가 없습니다. 새 조리계획서를 작성해보세요.'}
              </p>
              <Button onClick={handleCreateNewClick} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                새 조리계획서 작성
              </Button>
            </div>
          ) : (
            <div className="p-4">
              <div className="rounded-lg border overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead 
                        className="px-4 py-3 font-medium text-sm cursor-pointer"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center">
                          날짜
                          {sortField === 'date' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="px-4 py-3 font-medium text-sm">식사 시간</TableHead>
                      <TableHead className="px-4 py-3 font-medium text-sm text-right">총 식수</TableHead>
                      <TableHead className="px-4 py-3 text-right font-medium text-sm">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCookingPlans.map((plan) => (
                      <TableRow key={plan.date} className="hover:bg-slate-50 text-sm">
                        <TableCell className="px-4 py-3 font-medium whitespace-nowrap">
                          <span className="hidden md:inline">{format(new Date(plan.date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
                          <span className="md:hidden">{format(new Date(plan.date), 'MM/dd(EEE)', { locale: ko })}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {plan.meal_times.map((meal, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-xs px-2 py-0.5">
                                <Clock className="h-3 w-3 mr-1" />
                                {getMealTimeName(meal)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {plan.total_headcount}명
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div className="flex justify-end space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewCookingPlan(plan.date)}
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditCookingPlan(plan.date)}
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setDeletingDate(plan.date);
                                setShowDeleteDialog(true);
                              }}
                              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between p-2 text-xs sm:text-sm text-gray-500 gap-2">
                <div>
                  총 {sortedCookingPlans.length}개의 조리계획서
                </div>
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <span className="whitespace-nowrap">
                    {format(filterStartDate, 'yyyy.MM.dd', { locale: ko })} - {format(filterEndDate, 'yyyy.MM.dd', { locale: ko })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* 새 조리계획서 작성 */}
        <TabsContent value="create" className="m-0 px-4 py-6">
          <CookingPlanContainer 
            companyId={companyId} 
            initialDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined}
            onComplete={() => {
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