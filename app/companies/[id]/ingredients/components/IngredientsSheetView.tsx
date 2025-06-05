'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, ArrowUpDown, X } from 'lucide-react';
import { Ingredient } from '../types';
import { formatCurrency, formatNumber } from '../utils';

interface IngredientsSheetViewProps {
  companyId: string;
  ingredients: Ingredient[];
  isLoading: boolean;
  isOwnerOrAdmin: boolean;
  onRefresh: () => void;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (newPage: number) => void;
  // 서버사이드 정렬을 위한 props 추가
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
}

// 키보드 네비게이션을 위한 셀 위치 타입
interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

// 편집 가능한 셀 컴포넌트 - 키보드 네비게이션 추가
const EditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [editValue, setEditValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    // 테이블 메타데이터에서 업데이트 함수 호출
    table.options.meta?.updateData(row.index, column.id, editValue);
    setIsEditing(false);
  }, [editValue, row.index, column.id, table]);

  const handleCancel = useCallback(() => {
    setEditValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // 다음 행의 같은 컬럼으로 이동하고 편집 모드로 진입 (마지막 행이면 이동하지 않음)
      if (row.index < table.getRowModel().rows.length - 1) {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      // Tab: 다음 컬럼으로 이동, Shift+Tab: 이전 컬럼으로 이동하고 편집 모드로 진입
      const nextColumnIndex = e.shiftKey ? column.getIndex() - 1 : column.getIndex() + 1;
      table.options.meta?.navigateToCell?.(row.index, nextColumnIndex, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 아래 화살표 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      table.options.meta?.navigateToCell?.(row.index - 1, column.getIndex(), true);
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() + 1, true);
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() - 1, true);
    }
  }, [handleSave, handleCancel, row.index, column, table, isEditing]);

  // 외부에서 편집 모드 진입 요청 처리
  React.useEffect(() => {
    const handleCellEdit = (event: CustomEvent) => {
      const { rowIndex, columnIndex } = event.detail;
      if (rowIndex === row.index && columnIndex === column.getIndex()) {
        setIsEditing(true);
      }
    };

    window.addEventListener('editCell', handleCellEdit as EventListener);
    return () => {
      window.removeEventListener('editCell', handleCellEdit as EventListener);
    };
  }, [row.index, column]);

  React.useEffect(() => {
    setEditValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
      />
    );
  }

  return (
    <div
      className="h-8 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {initialValue || '-'}
    </div>
  );
};

// 숫자 편집 셀 컴포넌트 - 키보드 네비게이션 및 스피너 제거
const NumberEditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [editValue, setEditValue] = useState(initialValue?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const numValue = parseFloat(editValue) || 0;
    table.options.meta?.updateData(row.index, column.id, numValue);
    setIsEditing(false);
  }, [editValue, row.index, column.id, table]);

  const handleCancel = useCallback(() => {
    setEditValue(initialValue?.toString() || '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 Enter 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      const nextColumnIndex = e.shiftKey ? column.getIndex() - 1 : column.getIndex() + 1;
      table.options.meta?.navigateToCell?.(row.index, nextColumnIndex, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 아래 화살표 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      table.options.meta?.navigateToCell?.(row.index - 1, column.getIndex(), true);
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() + 1, true);
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() - 1, true);
    }
  }, [handleSave, handleCancel, row.index, column, table, isEditing]);

  // 외부에서 편집 모드 진입 요청 처리
  React.useEffect(() => {
    const handleCellEdit = (event: CustomEvent) => {
      const { rowIndex, columnIndex } = event.detail;
      if (rowIndex === row.index && columnIndex === column.getIndex()) {
        setIsEditing(true);
      }
    };

    window.addEventListener('editCell', handleCellEdit as EventListener);
    return () => {
      window.removeEventListener('editCell', handleCellEdit as EventListener);
    };
  }, [row.index, column]);

  React.useEffect(() => {
    setEditValue(initialValue?.toString() || '');
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ MozAppearance: 'textfield' }}
      />
    );
  }

  return (
    <div
      className="h-8 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {initialValue ? formatNumber(initialValue) : '-'}
    </div>
  );
};

// 가격 편집 셀 컴포넌트 - 키보드 네비게이션 및 스피너 제거
const PriceEditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [editValue, setEditValue] = useState(initialValue?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const numValue = parseFloat(editValue) || 0;
    table.options.meta?.updateData(row.index, column.id, numValue);
    setIsEditing(false);
  }, [editValue, row.index, column.id, table]);

  const handleCancel = useCallback(() => {
    setEditValue(initialValue?.toString() || '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 Enter 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      const nextColumnIndex = e.shiftKey ? column.getIndex() - 1 : column.getIndex() + 1;
      table.options.meta?.navigateToCell?.(row.index, nextColumnIndex, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 아래 화살표 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      table.options.meta?.navigateToCell?.(row.index - 1, column.getIndex(), true);
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() + 1, true);
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() - 1, true);
    }
  }, [handleSave, handleCancel, row.index, column, table, isEditing]);

  // 외부에서 편집 모드 진입 요청 처리
  React.useEffect(() => {
    const handleCellEdit = (event: CustomEvent) => {
      const { rowIndex, columnIndex } = event.detail;
      if (rowIndex === row.index && columnIndex === column.getIndex()) {
        setIsEditing(true);
      }
    };

    window.addEventListener('editCell', handleCellEdit as EventListener);
    return () => {
      window.removeEventListener('editCell', handleCellEdit as EventListener);
    };
  }, [row.index, column]);

  React.useEffect(() => {
    setEditValue(initialValue?.toString() || '');
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ MozAppearance: 'textfield' }}
      />
    );
  }

  return (
    <div
      className="h-8 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {initialValue ? formatCurrency(initialValue) : '-'}
    </div>
  );
};

// 단위 편집 셀 컴포넌트 - 키보드 네비게이션 추가
const UnitEditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [editValue, setEditValue] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const unitOptions = ['g', 'EA', 'ml'];

  const handleSave = useCallback(() => {
    table.options.meta?.updateData(row.index, column.id, editValue);
    setIsEditing(false);
  }, [editValue, row.index, column.id, table]);

  const handleCancel = useCallback(() => {
    setEditValue(initialValue || '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 Enter 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      const nextColumnIndex = e.shiftKey ? column.getIndex() - 1 : column.getIndex() + 1;
      table.options.meta?.navigateToCell?.(row.index, nextColumnIndex, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 아래 화살표 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      table.options.meta?.navigateToCell?.(row.index - 1, column.getIndex(), true);
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() + 1, true);
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() - 1, true);
    }
  }, [handleSave, handleCancel, row.index, column, table, isEditing]);

  // 외부에서 편집 모드 진입 요청 처리
  React.useEffect(() => {
    const handleCellEdit = (event: CustomEvent) => {
      const { rowIndex, columnIndex } = event.detail;
      if (rowIndex === row.index && columnIndex === column.getIndex()) {
        setIsEditing(true);
      }
    };

    window.addEventListener('editCell', handleCellEdit as EventListener);
    return () => {
      window.removeEventListener('editCell', handleCellEdit as EventListener);
    };
  }, [row.index, column]);

  React.useEffect(() => {
    setEditValue(initialValue || '');
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm w-full border border-gray-300 rounded px-2"
      >
        <option value="">선택</option>
        {unitOptions.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  return (
    <div
      className="h-8 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {initialValue ? (
        <Badge variant="outline" className="text-xs">
          {initialValue}
        </Badge>
      ) : (
        '-'
      )}
    </div>
  );
};

// 재고등급 편집 셀 컴포넌트 - 키보드 네비게이션 추가
const StockGradeEditableCell = ({ getValue, row, column, table }: any) => {
  const initialValue = getValue();
  const [editValue, setEditValue] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    table.options.meta?.updateData(row.index, column.id, editValue);
    setIsEditing(false);
  }, [editValue, row.index, column.id, table]);

  const handleCancel = useCallback(() => {
    setEditValue(initialValue || '');
    setIsEditing(false);
  }, [initialValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 Enter 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      const nextColumnIndex = e.shiftKey ? column.getIndex() - 1 : column.getIndex() + 1;
      table.options.meta?.navigateToCell?.(row.index, nextColumnIndex, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSave();
      // 마지막 행에서 아래 화살표 시 새 행 추가
      if (row.index === table.getRowModel().rows.length - 1) {
        table.options.meta?.addNewRow?.();
      } else {
        table.options.meta?.navigateToCell?.(row.index + 1, column.getIndex(), true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSave();
      table.options.meta?.navigateToCell?.(row.index - 1, column.getIndex(), true);
    } else if (e.key === 'ArrowRight' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() + 1, true);
    } else if (e.key === 'ArrowLeft' && !isEditing) {
      e.preventDefault();
      table.options.meta?.navigateToCell?.(row.index, column.getIndex() - 1, true);
    }
  }, [handleSave, handleCancel, row.index, column, table, isEditing]);

  // 외부에서 편집 모드 진입 요청 처리
  React.useEffect(() => {
    const handleCellEdit = (event: CustomEvent) => {
      const { rowIndex, columnIndex } = event.detail;
      if (rowIndex === row.index && columnIndex === column.getIndex()) {
        setIsEditing(true);
      }
    };

    window.addEventListener('editCell', handleCellEdit as EventListener);
    return () => {
      window.removeEventListener('editCell', handleCellEdit as EventListener);
    };
  }, [row.index, column]);

  React.useEffect(() => {
    setEditValue(initialValue || '');
  }, [initialValue]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
        placeholder="재고등급 입력"
      />
    );
  }

  return (
    <div
      className="h-8 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-sm flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={() => setIsEditing(true)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {initialValue || '-'}
    </div>
  );
};

export default function IngredientsSheetView({
  companyId,
  ingredients,
  isLoading,
  isOwnerOrAdmin,
  onRefresh,
  pagination,
  onPageChange,
  // 서버사이드 정렬을 위한 props 추가
  sortField,
  sortDirection,
  onSort
}: IngredientsSheetViewProps) {
  const { toast } = useToast();
  const [data, setData] = useState<Ingredient[]>(ingredients);
  // 원본 데이터를 별도로 저장하여 취소 기능에 사용
  const [originalData, setOriginalData] = useState<Ingredient[]>(ingredients);
  const [changedRows, setChangedRows] = useState<Set<number>>(new Set());
  // 새로 추가된 행들 추적 (임시 ID 사용)
  const [newRows, setNewRows] = useState<Set<number>>(new Set());
  // 임시 ID 카운터 (새 행에 음수 ID 부여)
  const [tempIdCounter, setTempIdCounter] = useState(-1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentCell, setCurrentCell] = useState<CellPosition>({ rowIndex: 0, columnIndex: 0 });
  const tableRef = useRef<HTMLTableElement>(null);

  // 데이터가 변경될 때 로컬 상태 업데이트
  React.useEffect(() => {
    setData(ingredients);
    setOriginalData(ingredients);
    setChangedRows(new Set());
    setNewRows(new Set());
    setTempIdCounter(-1);
  }, [ingredients]);

  // 페이지 이탈 시 변경사항 확인
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (changedRows.size > 0 || newRows.size > 0) {
        e.preventDefault();
        e.returnValue = '저장되지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [changedRows.size, newRows.size]);

  // 컬럼 헬퍼 생성
  const columnHelper = createColumnHelper<Ingredient>();

  // 데이터 업데이트 함수
  const updateData = useCallback((rowIndex: number, columnId: string, value: any) => {
    setData(prev => {
      const newData = [...prev];
      newData[rowIndex] = {
        ...newData[rowIndex],
        [columnId]: value
      };
      return newData;
    });
    
    // 변경된 행 추적
    setChangedRows(prev => new Set([...prev, rowIndex]));
  }, []);

  // 키보드 네비게이션 함수 - 편집 모드 진입 옵션 추가
  const navigateToCell = useCallback((rowIndex: number, columnIndex: number, startEditing: boolean = false) => {
    const maxRowIndex = data.length - 1;
    const maxColumnIndex = 17; // 총 18개 컬럼 (0-17)
    
    // 경계 체크
    const newRowIndex = Math.max(0, Math.min(rowIndex, maxRowIndex));
    const newColumnIndex = Math.max(0, Math.min(columnIndex, maxColumnIndex));
    
    setCurrentCell({ rowIndex: newRowIndex, columnIndex: newColumnIndex });
    
    // 해당 셀에 포커스 설정 및 편집 모드 진입
    setTimeout(() => {
      if (startEditing) {
        // 편집 모드로 진입하기 위한 커스텀 이벤트 발생
        const editEvent = new CustomEvent('editCell', {
          detail: { rowIndex: newRowIndex, columnIndex: newColumnIndex }
        });
        window.dispatchEvent(editEvent);
      } else {
        // 단순 포커스만 설정
        const cellElement = tableRef.current?.querySelector(
          `tbody tr:nth-child(${newRowIndex + 1}) td:nth-child(${newColumnIndex + 1}) [tabindex="0"]`
        ) as HTMLElement;
        
        if (cellElement) {
          cellElement.focus();
        }
      }
    }, 0);
  }, [data.length]);

  // 새 행 추가 함수 (버튼 클릭 시 - 최상단에 추가)
  const addNewRowAtTop = useCallback(() => {
    const newIngredient: Ingredient = {
      id: `temp_${Math.abs(tempIdCounter)}`, // 임시 문자열 ID 사용
      name: '새 식재료',
      code_name: '',
      supplier: '',
      package_amount: 1,
      unit: 'g',
      pac_count: 1,
      items_per_box: 1,
      price: 0,
      stock_grade: '',
      origin: '',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      allergens: '',
      memo1: '',
      memo2: '',
      created_at: new Date().toISOString(), // 현재 시간으로 설정
    };

    // 로컬 데이터의 최상단에 추가
    setData(prev => [newIngredient, ...prev]);
    
    // 기존 선택된 행들의 인덱스를 1씩 증가 (새 행이 최상단에 추가되었으므로)
    setSelectedRows(prev => new Set([...prev].map(index => index + 1)));
    
    // 변경된 행들의 인덱스도 1씩 증가
    setChangedRows(prev => new Set([...prev].map(index => index + 1)));
    
    // 새 행 추적에 추가 (0번 인덱스)
    setNewRows(prev => new Set([...prev, 0]));
    
    // 임시 ID 카운터 감소
    setTempIdCounter(prev => prev - 1);
    
    // 새로 추가된 행(0번 행)의 첫 번째 컬럼으로 이동하고 편집 모드로 진입
    setTimeout(() => {
      navigateToCell(0, 1, true); // 0번 행, 1번 컬럼(식재료명)으로 이동
    }, 100);
    
    toast({
      title: '행 추가',
      description: '새 식재료 행이 추가되었습니다. 저장 버튼을 눌러 저장하세요.',
    });
  }, [tempIdCounter, navigateToCell, toast]);

  // 새 행 추가 함수 (키보드에서 호출 - 최하단에 추가)
  const addNewRowFromKeyboard = useCallback(() => {
    const newIngredient: Ingredient = {
      id: `temp_${Math.abs(tempIdCounter)}`, // 임시 문자열 ID 사용
      name: '새 식재료',
      code_name: '',
      supplier: '',
      package_amount: 1,
      unit: 'g',
      pac_count: 1,
      items_per_box: 1,
      price: 0,
      stock_grade: '',
      origin: '',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      allergens: '',
      memo1: '',
      memo2: '',
      created_at: new Date().toISOString(), // 현재 시간으로 설정
    };

    // 로컬 데이터의 최하단에 추가
    setData(prev => [...prev, newIngredient]);
    
    // 새 행 추적에 추가 (마지막 인덱스)
    setNewRows(prev => new Set([...prev, data.length]));
    
    // 임시 ID 카운터 감소
    setTempIdCounter(prev => prev - 1);
    
    // 새로 추가된 행의 첫 번째 컬럼으로 이동하고 편집 모드로 진입
    setTimeout(() => {
      navigateToCell(data.length, 1, true); // 마지막 행, 1번 컬럼(식재료명)으로 이동
    }, 100);
    
    toast({
      title: '행 추가',
      description: '새 식재료 행이 추가되었습니다. 저장 버튼을 눌러 저장하세요.',
    });
  }, [tempIdCounter, data.length, navigateToCell, toast]);

  // 행 선택/해제 함수
  const toggleRowSelection = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

  // 전체 선택/해제 함수
  const toggleAllSelection = useCallback(() => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: data.length }, (_, i) => i)));
    }
  }, [selectedRows.size, data.length]);

  // 서버사이드 정렬 핸들러
  const handleServerSort = useCallback((field: string) => {
    if (!onSort) return;
    
    // 현재 정렬 필드와 같으면 방향을 토글, 다르면 asc로 시작
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  }, [onSort, sortField, sortDirection]);

  // 선택된 행들 삭제 함수
  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.size === 0) {
      toast({
        title: '알림',
        description: '삭제할 행을 선택해주세요.',
      });
      return;
    }

    if (!confirm(`선택된 ${selectedRows.size}개의 식재료를 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const selectedData = Array.from(selectedRows).map(index => data[index]);
      
      // API 호출하여 선택된 식재료들 삭제
      const promises = selectedData.map(async (ingredient) => {
        const response = await fetch(`/api/companies/${companyId}/ingredients/${ingredient.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${ingredient.name} 삭제 실패: ${errorData.error || '알 수 없는 오류'}`);
        }

        return response.json();
      });

      await Promise.all(promises);

      toast({
        title: '삭제 완료',
        description: `${selectedRows.size}개의 식재료가 성공적으로 삭제되었습니다.`,
      });

      // 로컬 데이터에서 삭제된 행들 제거
      const sortedIndices = Array.from(selectedRows).sort((a, b) => b - a);
      setData(prev => {
        const newData = [...prev];
        sortedIndices.forEach(index => {
          newData.splice(index, 1);
        });
        return newData;
      });

      // 변경된 행과 선택된 행 상태 초기화
      setChangedRows(new Set());
      setSelectedRows(new Set());
      
      onRefresh();
    } catch (error) {
      console.error('삭제 오류:', error);
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRows, data, companyId, toast, onRefresh]);

  // 컬럼 정의
  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedRows.size === data.length && data.length > 0}
            onChange={toggleAllSelection}
            className="rounded border-gray-300"
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectedRows.has(row.index)}
            onChange={() => toggleRowSelection(row.index)}
            className="rounded border-gray-300"
          />
        </div>
      ),
      size: 60,
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => handleServerSort('name')}
          className="h-8 px-2 font-medium text-gray-500 hover:text-gray-700"
        >
          식재료명
          {sortField === 'name' ? (
            sortDirection === 'asc' ? (
              <span className="ml-2 text-blue-600">↑</span>
            ) : (
              <span className="ml-2 text-blue-600">↓</span>
            )
          ) : (
            <ArrowUpDown className="ml-2 h-3 w-3" />
          )}
        </Button>
      ),
      cell: EditableCell,
      size: 180,
      enableSorting: false,
    },
    {
      accessorKey: 'code_name',
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => handleServerSort('code_name')}
          className="h-8 px-2 font-medium text-gray-500 hover:text-gray-700"
        >
          코드명
          {sortField === 'code_name' ? (
            sortDirection === 'asc' ? (
              <span className="ml-2 text-blue-600">↑</span>
            ) : (
              <span className="ml-2 text-blue-600">↓</span>
            )
          ) : (
            <ArrowUpDown className="ml-2 h-3 w-3" />
          )}
        </Button>
      ),
      cell: EditableCell,
      size: 140,
      enableSorting: false,
    },
    {
      accessorKey: 'supplier',
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => handleServerSort('supplier')}
          className="h-8 px-2 font-medium text-gray-500 hover:text-gray-700"
        >
          공급업체
          {sortField === 'supplier' ? (
            sortDirection === 'asc' ? (
              <span className="ml-2 text-blue-600">↑</span>
            ) : (
              <span className="ml-2 text-blue-600">↓</span>
            )
          ) : (
            <ArrowUpDown className="ml-2 h-3 w-3" />
          )}
        </Button>
      ),
      cell: EditableCell,
      size: 140,
      enableSorting: false,
    },
    {
      accessorKey: 'package_amount',
      header: '포장량',
      cell: NumberEditableCell,
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: 'unit',
      header: '단위',
      cell: UnitEditableCell,
      size: 70,
      enableSorting: false,
    },
    {
      accessorKey: 'pac_count',
      header: '팩수량',
      cell: NumberEditableCell,
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: 'items_per_box',
      header: '박스당개수',
      cell: NumberEditableCell,
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: 'price',
      header: ({ column }: any) => (
        <Button
          variant="ghost"
          onClick={() => handleServerSort('price')}
          className="h-8 px-2 font-medium text-gray-500 hover:text-gray-700"
        >
          가격
          {sortField === 'price' ? (
            sortDirection === 'asc' ? (
              <span className="ml-2 text-blue-600">↑</span>
            ) : (
              <span className="ml-2 text-blue-600">↓</span>
            )
          ) : (
            <ArrowUpDown className="ml-2 h-3 w-3" />
          )}
        </Button>
      ),
      cell: PriceEditableCell,
      size: 110,
      enableSorting: false,
    },
    {
      accessorKey: 'stock_grade',
      header: '재고등급',
      cell: StockGradeEditableCell,
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: 'origin',
      header: '원산지',
      cell: EditableCell,
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: 'calories',
      header: '칼로리',
      cell: NumberEditableCell,
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: 'protein',
      header: '단백질(g)',
      cell: NumberEditableCell,
      size: 90,
      enableSorting: false,
    },
    {
      accessorKey: 'fat',
      header: '지방(g)',
      cell: NumberEditableCell,
      size: 80,
      enableSorting: false,
    },
    {
      accessorKey: 'carbs',
      header: '탄수화물(g)',
      cell: NumberEditableCell,
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: 'allergens',
      header: '알레르기정보',
      cell: EditableCell,
      size: 120,
      enableSorting: false,
    },
    {
      accessorKey: 'memo1',
      header: '메모1',
      cell: EditableCell,
      size: 120,
      enableSorting: false,
    },
    {
      accessorKey: 'memo2',
      header: '메모2',
      cell: EditableCell,
      size: 120,
      enableSorting: false,
    },
  ], [selectedRows, data.length, toggleAllSelection, toggleRowSelection, handleServerSort, sortField]);

  // 테이블 인스턴스 생성
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: [], // 서버사이드 정렬을 사용하므로 클라이언트 정렬 비활성화
    },
    onSortingChange: () => {}, // 서버사이드 정렬을 사용하므로 비활성화
    getCoreRowModel: getCoreRowModel(),
    // getSortedRowModel 제거 - 서버사이드 정렬 사용
    getFilteredRowModel: getFilteredRowModel(),
    enableSorting: false, // 클라이언트 정렬 비활성화
    meta: {
      updateData,
      navigateToCell,
      addNewRow: addNewRowFromKeyboard,
    },
  });

  // 변경사항 저장
  const handleSaveChanges = async () => {
    if (changedRows.size === 0 && newRows.size === 0) {
      toast({
        title: '알림',
        description: '변경된 데이터가 없습니다.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];
      
      // 새로 추가된 행들 처리 (POST)
      const newRowsData = Array.from(newRows).map(index => data[index]);
      for (const ingredient of newRowsData) {
        // 임시 ID와 created_at 제거하고 서버에 전송
        const { id, created_at, ...ingredientData } = ingredient;
        
        const promise = fetch(`/api/companies/${companyId}/ingredients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredientData),
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${ingredient.name} 추가 실패: ${errorData.error || '알 수 없는 오류'}`);
          }
          return response.json();
        });
        
        promises.push(promise);
      }
      
      // 수정된 행들 처리 (PUT) - 새 행이 아닌 것만
      const modifiedRowsData = Array.from(changedRows)
        .filter(index => !newRows.has(index))
        .map(index => data[index]);
        
      for (const ingredient of modifiedRowsData) {
        const promise = fetch(`/api/companies/${companyId}/ingredients/${ingredient.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ingredient),
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`${ingredient.name} 저장 실패: ${errorData.error || '알 수 없는 오류'}`);
          }
          return response.json();
        });
        
        promises.push(promise);
      }

      await Promise.all(promises);

      const totalChanges = newRows.size + modifiedRowsData.length;
      toast({
        title: '저장 완료',
        description: `${totalChanges}개의 식재료가 성공적으로 저장되었습니다.`,
      });

      setChangedRows(new Set());
      setNewRows(new Set());
      onRefresh();
    } catch (error) {
      console.error('저장 오류:', error);
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 변경사항 취소
  const handleCancelChanges = () => {
    if (changedRows.size === 0 && newRows.size === 0) {
      toast({
        title: '알림',
        description: '취소할 변경사항이 없습니다.',
      });
      return;
    }

    // 원본 데이터로 복구 (새로 추가된 행들은 제거됨)
    setData([...originalData]);
    setChangedRows(new Set());
    setNewRows(new Set());
    
    toast({
      title: '취소 완료',
      description: '변경사항이 취소되었습니다.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 상단 액션 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">식재료 관리</h3>
          {newRows.size > 0 && (
            <Badge variant="default">
              {newRows.size}개 새로 추가됨
            </Badge>
          )}
          {changedRows.size > 0 && (
            <Badge variant="secondary">
              {Array.from(changedRows).filter(index => !newRows.has(index)).length}개 변경됨
            </Badge>
          )}
          {selectedRows.size > 0 && (
            <Badge variant="outline">
              {selectedRows.size}개 선택됨
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && isOwnerOrAdmin && (
            <Button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? '삭제 중...' : `${selectedRows.size}개 삭제`}
            </Button>
          )}
          
          <Button
            onClick={addNewRowAtTop}
            variant="outline"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            식재료 추가
          </Button>
          
          {/* 변경사항 취소 버튼 */}
          {(changedRows.size > 0 || newRows.size > 0) && (
            <Button
              onClick={handleCancelChanges}
              disabled={isSaving}
              variant="outline"
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              변경사항 취소
            </Button>
          )}
          
          <Button
            onClick={handleSaveChanges}
            disabled={(changedRows.size === 0 && newRows.size === 0) || isSaving}
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '저장 중...' : '변경사항 저장'}
          </Button>
        </div>
      </div>

      {/* 스프레드시트 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 ${
                    newRows.has(index) ? 'bg-green-50 border-l-4 border-green-400' : 
                    changedRows.has(index) ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                  } ${
                    selectedRows.has(index) ? 'bg-yellow-50' : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-2 py-1 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {pagination && onPageChange && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            총 {pagination.total}개 중 {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              이전
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i;
                if (pageNum > pagination.totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* 도움말 */}
      <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg mt-4">
        <p className="font-medium mb-1">사용법:</p>
        <ul className="space-y-1 text-xs">
          <li>• 셀을 클릭하거나 키보드로 이동하면 바로 편집 모드로 진입합니다</li>
          <li>• <strong>키보드 네비게이션:</strong> Tab/Shift+Tab (좌우), 화살표 키 (상하좌우), Enter (아래로)</li>
          <li>• <strong>새 행 추가:</strong> 마지막 행에서 아래 화살표를 누르면 자동으로 새 행이 추가됩니다</li>
          <li>• <strong>행 삭제:</strong> 체크박스로 행을 선택한 후 삭제 버튼을 클릭하여 삭제할 수 있습니다</li>
          <li>• <strong>편집 제어:</strong> Enter 키로 다음 행 이동, Esc 키로 편집 취소</li>
          <li>• <strong>서버사이드 정렬:</strong> 식재료명, 코드명, 공급업체, 가격 헤더를 클릭하면 전체 데이터가 정렬됩니다</li>
          <li>• <strong>정렬 표시:</strong> 정렬된 컬럼은 파란색 화살표(↑오름차순/↓내림차순)로 표시됩니다</li>
          <li>• <strong>변경사항 표시:</strong> 새로 추가된 행은 초록색, 수정된 행은 파란색, 선택된 행은 노란색으로 표시됩니다</li>
          <li>• <strong>저장 방식:</strong> 변경사항은 "변경사항 저장" 버튼을 눌러야 서버에 저장됩니다</li>
          <li>• <strong>취소 기능:</strong> "변경사항 취소" 버튼으로 저장하지 않은 모든 변경사항을 되돌릴 수 있습니다</li>
          <li>• <strong>입력 가능 정보:</strong> 영양성분(칼로리, 단백질, 지방, 탄수화물), 알레르기정보, 메모 등을 입력할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
} 