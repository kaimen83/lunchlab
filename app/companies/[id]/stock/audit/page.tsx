"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Edit3,
  Save,
  RotateCcw,
  Warehouse,
  X,
  Trash2
} from "lucide-react";
import { StockAudit, StockAuditItem, StockAuditDetailResponse, CreateStockAuditRequest } from "@/types/stock-audit";
import WarehouseSelector from "@/components/stock/WarehouseSelector";

interface StockAuditPageProps {
  companyId: string;
  selectedWarehouseId?: string;
}

export default function StockAuditPage({ companyId, selectedWarehouseId: initialWarehouseId }: StockAuditPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  // 상태 관리
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [currentAudit, setCurrentAudit] = useState<StockAuditDetailResponse | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(initialWarehouseId);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]); // 창고 목록
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<StockAuditItem | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 엑셀시트 형태 편집을 위한 상태
  const [pendingChanges, setPendingChanges] = useState<Map<string, { actual_quantity?: number; notes?: string }>>(new Map());
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: 'actual_quantity' | 'notes' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    itemType: 'all',
    search: ''
  });

  // 검색 입력 상태 (실제 검색과 분리)
  const [searchInput, setSearchInput] = useState('');

  // 검색 실행 함수
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput }));
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 검색 초기화 함수
  const handleClearSearch = () => {
    setSearchInput('');
    setFilters(prev => ({ ...prev, search: '' }));
    setCurrentPage(1);
  };

  // 엔터키로 검색
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // 선택된 날짜와 창고 기반 실사명 생성
  const getAuditNameByDate = (date: Date, warehouseId?: string, stockGrades?: string[]) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 창고명 찾기
    const warehouse = warehouses.find(w => w.id === warehouseId);
    const warehouseName = warehouse?.name || '미지정창고';
    
    // 등급 표시
    let gradeSuffix = '';
    if (stockGrades && stockGrades.length > 0) {
      // '용기'를 제외한 등급들만 필터링
      const grades = stockGrades.filter(g => g !== '용기');
      if (grades.length > 0) {
        gradeSuffix = `(${grades.join(', ')} 등급)`;
      }
      // 용기만 선택된 경우
      if (stockGrades.includes('용기') && grades.length === 0) {
        gradeSuffix = '(용기)';
      }
      // 등급과 용기가 함께 선택된 경우
      if (stockGrades.includes('용기') && grades.length > 0) {
        gradeSuffix = `(${grades.join(', ')} 등급, 용기)`;
      }
    }
    
    return `${year}년 ${month}월 ${day}일 ${warehouseName} 실사${gradeSuffix}`;
  };

  // 날짜 선택 상태
  const [selectedAuditDate, setSelectedAuditDate] = useState<Date>(new Date());

  // 날짜 선택 시 실사명과 audit_date 자동 업데이트
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedAuditDate(date);
    setNewAuditForm(prev => ({
      ...prev,
      name: getAuditNameByDate(date, selectedWarehouseId, prev.stock_grades),
      audit_date: format(date, 'yyyy-MM-dd'),
      warehouse_id: selectedWarehouseId || '' // 창고 ID 유지
    }));
  };

  // 창고 변경 핸들러
  const handleWarehouseChange = (warehouseId: string | null | undefined) => {
    setSelectedWarehouseId(warehouseId || undefined);
    setNewAuditForm(prev => ({
      ...prev,
      warehouse_id: warehouseId || '',
      name: getAuditNameByDate(selectedAuditDate, warehouseId || undefined, prev.stock_grades) // 창고 변경 시 실사명도 업데이트
    }));
  };

  // 재고등급 체크박스 변경 핸들러
  const handleStockGradeChange = (grade: string, checked: boolean) => {
    setNewAuditForm(prev => {
      const currentGrades = prev.stock_grades || [];
      let newGrades: string[];
      
      if (checked) {
        newGrades = [...currentGrades, grade];
      } else {
        newGrades = currentGrades.filter(g => g !== grade);
      }
      
      // item_types 업데이트: '용기' 선택 여부에 따라 container 포함/제외
      const newItemTypes = newGrades.includes('용기') 
        ? ['ingredient', 'container'] as ('ingredient' | 'container')[]
        : ['ingredient'] as ('ingredient' | 'container')[];
      
      return {
        ...prev,
        stock_grades: newGrades,
        item_types: newItemTypes,
        name: getAuditNameByDate(selectedAuditDate, selectedWarehouseId, newGrades)
      };
    });
  };

  // 새 실사 생성 폼 - 초기값은 빈 상태로 시작
  const [newAuditForm, setNewAuditForm] = useState({
    name: '',
    description: '',
    audit_date: format(new Date(), 'yyyy-MM-dd'), // YYYY-MM-DD 형식
    warehouse_id: selectedWarehouseId || '', // 창고 ID 추가
    item_types: ['ingredient'] as ('ingredient' | 'container')[], // 기본값은 식자재만
    stock_grades: [] as string[] // 재고등급 필터 배열
  });
  
  // 모달 상태 관리
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // 실사량 입력 폼
  const [auditForm, setAuditForm] = useState({
    actual_quantity: '',
    notes: ''
  });

  // 사용자 권한 조회
  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/membership`);
      if (!response.ok) throw new Error('사용자 권한 조회 실패');
      
      const data = await response.json();
      setUserRole(data.role);
    } catch (error) {
      console.error('사용자 권한 조회 오류:', error);
      setUserRole('member'); // 기본값으로 member 설정
    }
  }, [companyId]);

  // 창고 목록 조회
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/warehouses`);
      if (!response.ok) throw new Error('창고 목록 조회 실패');
      
      const data = await response.json();
      setWarehouses(data.warehouses || []);
    } catch (error) {
      console.error('창고 목록 조회 오류:', error);
      setWarehouses([]);
    }
  }, [companyId]);

  // 실사 목록 조회
  const fetchAudits = useCallback(async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/stock/audits`);
      if (!response.ok) throw new Error('실사 목록 조회 실패');
      
      const data = await response.json();
      setAudits(data.audits);
    } catch (error) {
      console.error('실사 목록 조회 오류:', error);
      toast({
        title: "오류 발생",
        description: "실사 목록을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    }
  }, [companyId, toast]);

  // 실사 상세 정보 조회
  const fetchAuditDetail = useCallback(async (auditId: string, page: number = 1) => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        itemType: filters.itemType !== 'all' ? filters.itemType : '',
        search: filters.search
      });
      
      const response = await fetch(
        `/api/companies/${companyId}/stock/audits/${auditId}?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('실사 상세 조회 실패');
      
      const data: StockAuditDetailResponse = await response.json();
      setCurrentAudit(data);
    } catch (error) {
      console.error('실사 상세 조회 오류:', error);
      toast({
        title: "오류 발생",
        description: "실사 상세 정보를 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, pageSize, filters, toast]);

  // 새 실사 생성
  const createAudit = async () => {
    if (!newAuditForm.name.trim()) {
      toast({
        title: "입력 오류",
        description: "실사명을 입력해주세요.",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch(`/api/companies/${companyId}/stock/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAuditForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || '실사 생성 실패');
      }
      
      const data = await response.json();
      
      // 더 자세한 성공 메시지
      const itemsInfo = data.items_count > 0 
        ? `총 ${data.items_count}개 항목(식자재 + 용기)으로 실사가 생성되었습니다.`
        : '재고 항목이 없어 빈 실사가 생성되었습니다.';
      
      toast({
        title: "실사 생성 완료",
        description: itemsInfo,
        duration: 1000,
      });
      
      // 폼 초기화 및 목록 새로고침
      const today = new Date();
      setSelectedAuditDate(today);
      setNewAuditForm({ 
        name: getAuditNameByDate(today, selectedWarehouseId, []), 
        description: '', 
        audit_date: format(today, 'yyyy-MM-dd'),
        warehouse_id: selectedWarehouseId || '', // 창고 ID 추가
        item_types: ['ingredient'], // 기본값은 식자재만
        stock_grades: [] // 재고등급 초기화
      });
      setIsCreateModalOpen(false); // 모달 닫기
      await fetchAudits();
      
      // 새로 생성된 실사로 이동
      await fetchAuditDetail(data.audit.id, 1);
    } catch (error) {
      console.error('실사 생성 오류:', error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "실사 생성 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 실사량 업데이트 (기존 모달 방식)
  const updateAuditItem = async () => {
    if (!editingItem || !auditForm.actual_quantity) {
      toast({
        title: "입력 오류",
        description: "실사량을 입력해주세요.",
        variant: "destructive",
        duration: 1000,
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/audits/${editingItem.audit_id}/items/${editingItem.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actual_quantity: parseFloat(auditForm.actual_quantity),
            notes: auditForm.notes
          })
        }
      );

      if (!response.ok) throw new Error('실사량 업데이트 실패');
      
      toast({
        title: "업데이트 완료",
        description: "실사량이 성공적으로 업데이트되었습니다.",
        duration: 1000,
      });
      
      // 폼 초기화 및 상세 정보 새로고침
      setEditingItem(null);
      setAuditForm({ actual_quantity: '', notes: '' });
      if (currentAudit) {
        await fetchAuditDetail(currentAudit.audit.id);
      }
    } catch (error) {
      console.error('실사량 업데이트 오류:', error);
      toast({
        title: "오류 발생",
        description: "실사량 업데이트 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  // 일괄 저장 함수
  const saveBatchChanges = async () => {
    if (!currentAudit || pendingChanges.size === 0) return;

    try {
      setIsSaving(true);
      
      // Map을 객체로 변환
      const updates = Object.fromEntries(pendingChanges);
      
      const response = await fetch(
        `/api/companies/${companyId}/stock/audits/${currentAudit.audit.id}/items/batch`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || '일괄 저장 실패');
      }
      
      const data = await response.json();
      toast({
        title: "저장 완료",
        description: `${data.updated_count}개 항목이 성공적으로 저장되었습니다.`,
        duration: 1000,
      });
      
      // 변경사항 초기화 및 데이터 새로고침
      setPendingChanges(new Map());
      setEditingCell(null);
      await fetchAuditDetail(currentAudit.audit.id);
      
    } catch (error) {
      console.error('일괄 저장 오류:', error);
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "저장 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 변경사항 취소
  const cancelChanges = () => {
    setPendingChanges(new Map());
    setEditingCell(null);
    toast({
      title: "변경사항 취소",
      description: "모든 변경사항이 취소되었습니다.",
      duration: 1000,
    });
  };

  // 셀 값 업데이트
  const updateCellValue = (itemId: string, field: 'actual_quantity' | 'notes', value: string | number) => {
    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      const existing = newChanges.get(itemId) || {};
      newChanges.set(itemId, {
        ...existing,
        [field]: field === 'actual_quantity' ? Number(value) : value
      });
      return newChanges;
    });
  };

  // 실사 완료 처리
  const completeAudit = async (applyDifferences: boolean = false) => {
    if (!currentAudit) return;

    try {
      const response = await fetch(
        `/api/companies/${companyId}/stock/audits/${currentAudit.audit.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            apply_differences: applyDifferences
          })
        }
      );

      if (!response.ok) throw new Error('실사 완료 처리 실패');
      
      const data = await response.json();
      toast({
        title: "실사 완료",
        description: applyDifferences 
          ? `실사가 완료되고 ${data.applied_count || 0}개 항목의 재고량이 반영되었습니다.`
          : "실사가 완료되었습니다.",
        duration: 1000,
      });
      
      await fetchAudits();
      await fetchAuditDetail(currentAudit.audit.id);
    } catch (error) {
      console.error('실사 완료 처리 오류:', error);
      toast({
        title: "오류 발생",
        description: "실사 완료 처리 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    }
  };

  // 실사 완료 확인 다이얼로그
  const handleCompleteAudit = () => {
    if (!currentAudit) return;
    
    const auditedItemsCount = currentAudit.items.filter(item => 
      item.actual_quantity !== null && item.actual_quantity !== undefined
    ).length;
    
    if (auditedItemsCount === 0) {
      // 실사량이 입력된 항목이 없으면 바로 완료
      completeAudit(false);
      return;
    }

    // 실사량이 입력된 항목이 있으면 확인 다이얼로그 표시
    const shouldApply = window.confirm(
      `실사량이 입력된 ${auditedItemsCount}개 항목이 있습니다.\n\n실사 완료와 함께 재고량을 실사량으로 반영하시겠습니까?\n\n- 확인: 실사 완료 + 재고량 반영\n- 취소: 실사만 완료 (재고량 반영 안함)`
    );
    
    completeAudit(shouldApply);
  };

  // 실사 삭제 함수
  const deleteAudit = async (auditId: string) => {
    if (!window.confirm('정말로 이 실사를 삭제하시겠습니까?\n삭제된 실사는 복구할 수 없습니다.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/companies/${companyId}/stock/audits/${auditId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '실사 삭제 실패');
      }

      toast({
        title: "삭제 완료",
        description: "실사가 성공적으로 삭제되었습니다.",
        duration: 1000,
      });

      // 실사 목록 새로고침
      await fetchAudits();
      
      // 삭제된 실사가 현재 선택된 실사라면 선택 해제
      if (currentAudit?.audit.id === auditId) {
        setCurrentAudit(null);
      }
      
    } catch (error) {
      console.error('실사 삭제 오류:', error);
      toast({
        title: "삭제 실패",
        description: error instanceof Error ? error.message : "실사 삭제 중 문제가 발생했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 상태별 색상 및 아이콘
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '완료' };
      case 'discrepancy':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, text: '차이' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, text: '대기' };
    }
  };

  // 편집 모달 열기
  const openEditModal = (item: StockAuditItem) => {
    setEditingItem(item);
    setAuditForm({
      actual_quantity: item.actual_quantity?.toString() || '',
      notes: item.notes || ''
    });
  };

  // 키보드 네비게이션 처리
  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: 'actual_quantity' | 'notes') => {
    if (!currentAudit) return;

    const items = getPaginatedItems();
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (e.key === 'Tab') {
      e.preventDefault();
      // Tab: 다음 편집 가능한 셀로 이동
      if (field === 'actual_quantity') {
        setEditingCell({ itemId, field: 'notes' });
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          setEditingCell({ itemId: items[nextIndex].id, field: 'actual_quantity' });
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter: 다음 행의 같은 필드로 이동
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        setEditingCell({ itemId: items[nextIndex].id, field });
      }
    } else if (e.key === 'Escape') {
      // Escape: 편집 취소
      setEditingCell(null);
    }
  };

  // 페이지네이션된 항목 가져오기 (이제 서버에서 처리됨)
  const getPaginatedItems = () => {
    return currentAudit?.items || [];
  };

  // 총 페이지 수 계산 (서버에서 받은 정보 사용)
  const getTotalPages = () => {
    return currentAudit?.pagination?.pageCount || 0;
  };

  // 페이지 변경 시 데이터 새로고침
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (currentAudit) {
      fetchAuditDetail(currentAudit.audit.id, newPage);
    }
  };

  // 인라인 편집 가능한 셀 컴포넌트
  const EditableCell = ({ 
    item, 
    field, 
    type = 'text' 
  }: { 
    item: StockAuditItem; 
    field: 'actual_quantity' | 'notes'; 
    type?: 'text' | 'number' 
  }) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field;
    const pendingValue = pendingChanges.get(item.id)?.[field];
    const currentValue = pendingValue !== undefined ? pendingValue : (item[field] ?? '');
    const hasChanges = pendingChanges.has(item.id) && pendingChanges.get(item.id)?.[field] !== undefined;

    if (isEditing) {
      return (
        <Input
          type={type}
          value={currentValue}
          onChange={(e) => updateCellValue(item.id, field, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, item.id, field)}
          onBlur={() => setEditingCell(null)}
          autoFocus
          className={`h-8 text-sm ${hasChanges ? 'border-orange-400 bg-orange-50' : ''}`}
          step={type === 'number' ? '0.001' : undefined}
        />
      );
    }

    return (
      <div
        className={`h-8 px-3 py-1 cursor-pointer hover:bg-gray-50 rounded border border-transparent ${
          hasChanges ? 'bg-orange-50 border-orange-200' : ''
        }`}
        onClick={() => setEditingCell({ itemId: item.id, field })}
      >
        <span className={`text-sm ${hasChanges ? 'font-medium text-orange-800' : ''}`}>
          {field === 'actual_quantity' 
            ? (currentValue !== '' ? Number(currentValue) : '-')
            : (currentValue || '-')
          }
        </span>
        {hasChanges && (
          <span className="ml-1 text-xs text-orange-600">●</span>
        )}
      </div>
    );
  };

  // 초기 데이터 로딩
  useEffect(() => {
    fetchUserRole();
    fetchAudits();
    fetchWarehouses();
  }, [fetchUserRole, fetchAudits, fetchWarehouses]);

  // 창고 목록을 가져온 후 실사명 초기값 설정
  useEffect(() => {
    if (warehouses.length > 0 && !newAuditForm.name) {
      setNewAuditForm(prev => ({
        ...prev,
        name: getAuditNameByDate(selectedAuditDate, selectedWarehouseId, prev.stock_grades)
      }));
    }
  }, [warehouses, selectedWarehouseId, selectedAuditDate]);

  // 필터 변경 시 상세 정보 새로고침 (페이지는 1로 리셋)
  useEffect(() => {
    if (currentAudit) {
      setCurrentPage(1);
      fetchAuditDetail(currentAudit.audit.id, 1);
    }
  }, [filters.itemType, filters.search, currentAudit?.audit.id, fetchAuditDetail]);

  // 실사 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1);
    setPendingChanges(new Map());
    setEditingCell(null);
  }, [currentAudit?.audit.id]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">재고 실사</h1>
        </div>
        
        {/* 새 실사 생성 버튼 */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 실사 시작
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>새 재고 실사 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>안내:</strong> 선택한 조건에 맞는 재고 항목들에 대해 실사가 생성됩니다.
                  재고등급을 선택하면 해당 등급의 식자재만, '용기'를 선택하면 용기가 포함됩니다.
                </p>
              </div>
              
              {/* 창고 선택 */}
              <div>
                <Label htmlFor="warehouse-selector">창고</Label>
                <WarehouseSelector
                  companyId={companyId}
                  selectedWarehouseId={selectedWarehouseId}
                  onWarehouseChange={handleWarehouseChange}
                  placeholder="창고를 선택하세요"
                  className="w-full"
                  showAllOption={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  실사를 진행할 창고를 선택하세요. 선택하지 않으면 기본 창고가 사용됩니다.
                </p>
              </div>
              
              {/* 재고등급 선택 */}
              <div>
                <Label>재고등급 선택 (복수 선택 가능)</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {['가', '나', '다', 'A', 'B', 'C'].map((grade) => (
                    <div key={grade} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`grade-${grade}`}
                        checked={newAuditForm.stock_grades?.includes(grade) || false}
                        onCheckedChange={(checked) => handleStockGradeChange(grade, checked as boolean)}
                      />
                      <label 
                        htmlFor={`grade-${grade}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {grade}등급
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox 
                      id="grade-container"
                      checked={newAuditForm.stock_grades?.includes('용기') || false}
                      onCheckedChange={(checked) => handleStockGradeChange('용기', checked as boolean)}
                    />
                    <label 
                      htmlFor="grade-container" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      용기 포함
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  실사할 재고 등급을 선택하세요. 선택하지 않으면 모든 등급이 포함됩니다.
                </p>
              </div>

              {/* 실사 날짜 선택 */}
              <div>
                <Label htmlFor="audit-date">실사 날짜</Label>
                <Input
                  id="audit-date"
                  type="date"
                  value={format(selectedAuditDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    handleDateSelect(newDate);
                  }}
                  className="w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="audit-name">실사명</Label>
                <Input
                  id="audit-name"
                  placeholder="예: 2024년 1월 정기실사"
                  value={newAuditForm.name}
                  onChange={(e) => setNewAuditForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  선택한 날짜에 따라 자동으로 생성됩니다. 필요시 수정 가능합니다.
                </p>
              </div>
              <div>
                <Label htmlFor="audit-description">설명 (선택사항)</Label>
                <Textarea
                  id="audit-description"
                  placeholder="실사에 대한 설명을 입력하세요"
                  value={newAuditForm.description}
                  onChange={(e) => setNewAuditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={createAudit} 
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? "생성 중..." : "실사 시작"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* 실사 목록 - 컴팩트한 디자인 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">실사 목록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  className={`p-2.5 rounded-md border transition-colors ${
                    currentAudit?.audit.id === audit.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => fetchAuditDetail(audit.id, 1)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">{audit.name}</h3>
                      <Badge 
                        variant={audit.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs px-1.5 py-0.5 ml-2 flex-shrink-0"
                      >
                        {audit.status === 'completed' ? '완료' : '진행중'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(audit.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  {/* 삭제 버튼 - 소유자/관리자만 표시, 완료되지 않은 실사만 */}
                  {(userRole === 'owner' || userRole === 'admin') && audit.status !== 'completed' && (
                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAudit(audit.id);
                        }}
                        disabled={isDeleting}
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {audits.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">실사가 없습니다</p>
                  <p className="text-xs">새 실사를 시작하세요</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 실사 상세 - 더 넓은 영역 */}
        <div className="lg:col-span-3">
          {currentAudit ? (
            <Card>
              <CardHeader className="pb-4">
                {/* 메인 헤더 - 제목과 액션 버튼 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{currentAudit.audit.name}</CardTitle>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
                        <Warehouse className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-xs font-medium text-slate-700">
                          {currentAudit?.warehouse?.name || '미지정'}
                        </span>
                      </div>
                    </div>
                    {currentAudit.audit.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {currentAudit.audit.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {currentAudit.audit.status === 'in_progress' && (
                      <Button
                        variant="outline"
                        onClick={handleCompleteAudit}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        실사 완료
                      </Button>
                    )}

                    {currentAudit.audit.status === 'completed' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">실사 완료</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 실사 현황 통계 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">실사 현황</h3>
                    <div className="text-xs text-gray-500">
                      {currentAudit.stats.completed_items + currentAudit.stats.discrepancy_items}/{currentAudit.stats.total_items} 항목 완료
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-50 rounded-md px-3 py-2 text-center border border-green-100">
                      <div className="text-base font-semibold text-green-600">
                        {currentAudit.stats.completed_items}
                      </div>
                      <div className="text-xs text-green-700 mt-0.5">정상</div>
                    </div>
                    <div className="bg-orange-50 rounded-md px-3 py-2 text-center border border-orange-100">
                      <div className="text-base font-semibold text-orange-600">
                        {currentAudit.stats.discrepancy_items}
                      </div>
                      <div className="text-xs text-orange-700 mt-0.5">차이</div>
                    </div>
                    <div className="bg-gray-50 rounded-md px-3 py-2 text-center border border-gray-200">
                      <div className="text-base font-semibold text-gray-600">
                        {currentAudit.stats.pending_items}
                      </div>
                      <div className="text-xs text-gray-700 mt-0.5">대기</div>
                    </div>
                    <div className="bg-slate-50 rounded-md px-3 py-2 text-center border border-slate-200">
                      <div className="text-base font-semibold text-slate-600">
                        {currentAudit.stats.total_items}
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">총계</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* 필터 및 액션 버튼 */}
                <div className="space-y-4">
                  <div className="flex space-x-3 items-center">
                    <div className="flex-1">
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="항목명, 코드, 등급으로 검색..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            className="pl-10"
                          />
                        </div>
                        <Button
                          onClick={handleSearch}
                          variant="outline"
                          size="default"
                          className="px-4"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          검색
                        </Button>
                        {filters.search && (
                          <Button
                            onClick={handleClearSearch}
                            variant="ghost"
                            size="default"
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* 항목 타입 필터 - 버튼 형태 */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant={filters.itemType === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, itemType: 'all' }))}
                        className="h-8 px-3"
                      >
                        전체
                      </Button>
                      <Button
                        variant={filters.itemType === 'ingredient' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, itemType: 'ingredient' }))}
                        className="h-8 px-3"
                      >
                        식자재
                      </Button>
                      <Button
                        variant={filters.itemType === 'container' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, itemType: 'container' }))}
                        className="h-8 px-3"
                      >
                        용기
                      </Button>
                    </div>
                  </div>

                  {/* 일괄 저장 버튼 */}
                  {pendingChanges.size > 0 && currentAudit?.audit.status === 'in_progress' && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-800">
                          {pendingChanges.size}개 항목에 저장되지 않은 변경사항이 있습니다.
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelChanges}
                          disabled={isSaving}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveBatchChanges}
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {isSaving ? '저장 중...' : '일괄 저장'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 엑셀시트 형태 실사 항목 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  {/* 테이블 헤더 - 항목 정보 표시 */}
                  <div className="bg-blue-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h3 className="font-medium text-blue-900">실사 항목 목록</h3>
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <span className="bg-blue-100 px-2 py-1 rounded">
                            총 {currentAudit.stats.total_items}개 항목
                          </span>
                          {currentAudit.pagination && currentAudit.pagination.total > pageSize && (
                            <span className="text-blue-600">
                              (현재 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, currentAudit.pagination.total)}개 표시)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-blue-600">
                        식자재 {currentAudit.items.filter(item => item.item_type === 'ingredient').length}개 + 
                        용기 {currentAudit.items.filter(item => item.item_type === 'container').length}개
                      </div>
                    </div>
                  </div>
                  
                  {/* 컬럼 헤더 */}
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex gap-3 text-sm font-medium text-gray-700">
                      <div className="flex-1 min-w-[200px]">항목명</div>
                      <div className="w-20 text-center">코드</div>
                      <div className="w-16 text-center">등급</div>
                      <div className="w-20 text-center">창고</div>
                      <div className="w-20 text-center">장부량</div>
                      <div className="w-20 text-center">실사량</div>
                      <div className="w-20 text-center">차이</div>
                      <div className="w-24 text-center">메모</div>
                    </div>
                  </div>
                  
                  {/* 실사 항목 목록 */}
                  <div className="divide-y divide-gray-200">
                    {getPaginatedItems().map((item) => {
                      const pendingData = pendingChanges.get(item.id);
                      const actualQuantity = pendingData?.actual_quantity !== undefined 
                        ? pendingData.actual_quantity 
                        : item.actual_quantity;
                      const notes = pendingData?.notes !== undefined 
                        ? pendingData.notes 
                        : item.notes;
                      
                      // 차이 계산 (실사량이 있을 때만)
                      const difference = actualQuantity !== null && actualQuantity !== undefined 
                        ? actualQuantity - item.book_quantity 
                        : null;
                      
                      return (
                        <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex gap-3 items-center text-sm">
                            {/* 항목명 */}
                            <div className="flex-1 min-w-[200px]">
                              <div className="font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-gray-500">
                                {item.item_type === 'ingredient' ? '식자재' : '용기'} • {item.unit || '-'}
                              </div>
                            </div>
                            
                            {/* 코드 */}
                            <div className="w-20 text-center">
                              {item.code_name ? (
                                <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 text-gray-800 rounded">
                                  {item.code_name}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            
                            {/* 등급 */}
                            <div className="w-16 text-center">
                              {item.stock_grade ? (
                                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {item.stock_grade}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            
                            {/* 창고 */}
                            <div className="w-20 text-center text-gray-600">
                              {currentAudit?.warehouse?.name || '미지정'}
                            </div>
                            
                            {/* 장부량 */}
                            <div className="w-20 text-center font-medium">
                              {item.book_quantity.toLocaleString()}
                            </div>
                            
                            {/* 실사량 */}
                            <div className="w-20 text-center">
                              {currentAudit.audit.status === 'in_progress' ? (
                                <EditableCell 
                                  item={item} 
                                  field="actual_quantity" 
                                  type="number" 
                                />
                              ) : (
                                <span className="font-mono">
                                  {actualQuantity !== null && actualQuantity !== undefined 
                                    ? actualQuantity 
                                    : '-'
                                  }
                                </span>
                              )}
                            </div>
                            
                            {/* 차이 */}
                            <div className="w-20 text-center">
                              {difference !== null && difference !== undefined ? (
                                <span className={`font-medium ${
                                  difference > 0 ? 'text-green-600' : 
                                  difference < 0 ? 'text-red-600' : 
                                  'text-gray-600'
                                }`}>
                                  {difference > 0 ? '+' : ''}{difference.toLocaleString()}
                                </span>
                              ) : '-'}
                            </div>
                            
                            {/* 메모 */}
                            <div className="w-24 text-center">
                              {currentAudit.audit.status === 'in_progress' ? (
                                <EditableCell 
                                  item={item} 
                                  field="notes" 
                                  type="text" 
                                />
                              ) : (
                                <span className="text-sm">
                                  {notes || '-'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* 페이지네이션 */}
                {currentAudit?.pagination && currentAudit.pagination.total > pageSize && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">총 {currentAudit.pagination.total}개 항목</span> 중 
                      <span className="font-medium"> {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, currentAudit.pagination.total)}개</span> 표시
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        이전
                      </Button>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500">페이지</span>
                        <span className="font-medium text-sm">{currentPage}</span>
                        <span className="text-sm text-gray-500">/ {getTotalPages()}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.min(getTotalPages(), currentPage + 1))}
                        disabled={currentPage === getTotalPages()}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                )}
                
                {currentAudit?.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>조건에 맞는 항목이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center text-gray-500">
                  <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">실사를 선택해주세요</p>
                  <p className="text-sm">왼쪽에서 실사를 선택하거나 새로 생성하세요.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 실사량 입력 모달 */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>실사량 입력</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-medium">{editingItem.item_name}</h3>
                <p className="text-sm text-gray-600">
                  장부량: {editingItem.book_quantity} {editingItem.unit}
                </p>
              </div>
              
              <div>
                <Label htmlFor="actual-quantity">실사량</Label>
                <Input
                  id="actual-quantity"
                  type="number"
                  step="0.001"
                  placeholder="실제 측정한 수량을 입력하세요"
                  value={auditForm.actual_quantity}
                  onChange={(e) => setAuditForm(prev => ({ ...prev, actual_quantity: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">메모 (선택사항)</Label>
                <Textarea
                  id="notes"
                  placeholder="특이사항이나 메모를 입력하세요"
                  value={auditForm.notes}
                  onChange={(e) => setAuditForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingItem(null)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button 
                  onClick={updateAuditItem}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 