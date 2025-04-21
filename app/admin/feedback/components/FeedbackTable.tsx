"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Eye,
  Search,
  MessageSquare,
  MailCheck
} from 'lucide-react'

// 피드백 인터페이스 정의
export interface Feedback {
  id: string
  content: string
  user_id: string | null
  user_email: string | null
  created_at: string
  status: string
  reply: string | null
  replied_at: string | null
  replied_by: string | null
}

// 피드백 테이블 props 인터페이스
interface FeedbackTableProps {
  data: Feedback[]
  statusFilter: string | null
  onStatusFilterChange: (status: string | null) => void
}

// 피드백 상태에 따른 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  switch(status) {
    case 'unread':
      return <Badge variant="destructive" className="flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        <span>읽지 않음</span>
      </Badge>
    case 'read':
      return <Badge variant="outline" className="flex items-center gap-1">
        <Eye className="h-3 w-3" />
        <span>검토중</span>
      </Badge>
    case 'replied':
      return <Badge variant="default" className="flex items-center gap-1">
        <MailCheck className="h-3 w-3" />
        <span>답변완료</span>
      </Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// 내용 텍스트 자르기 함수
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 날짜 포맷팅 함수
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function FeedbackTable({ 
  data, 
  statusFilter, 
  onStatusFilterChange 
}: FeedbackTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // 테이블 컬럼 정의
  const columns: ColumnDef<Feedback>[] = [
    {
      accessorKey: 'user_email',
      header: '이메일',
      cell: ({ row }) => {
        const email = row.getValue('user_email') as string | null
        return <div>{email || '익명 사용자'}</div>
      }
    },
    {
      accessorKey: 'content',
      header: '내용',
      cell: ({ row }) => {
        const content = row.getValue('content') as string
        return <div>{truncateText(content, 50)}</div>
      }
    },
    {
      accessorKey: 'created_at',
      header: '작성일',
      cell: ({ row }) => {
        const date = row.getValue('created_at') as string
        return <div>{formatDate(date)}</div>
      }
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return <StatusBadge status={status} />
      },
      filterFn: (row, id, value) => {
        return value === row.getValue(id)
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const feedback = row.original
        return (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href={`/admin/feedback/${feedback.id}`} className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                <span>상세보기</span>
              </Link>
            </Button>
          </div>
        )
      }
    }
  ]

  // 상태 필터 적용
  useEffect(() => {
    if (statusFilter) {
      setColumnFilters(prev => {
        const filtered = prev.filter(filter => filter.id !== 'status')
        return [...filtered, { id: 'status', value: statusFilter }]
      })
    } else {
      setColumnFilters(prev => prev.filter(filter => filter.id !== 'status'))
    }
  }, [statusFilter])

  // 테이블 인스턴스 생성
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* 검색창 */}
      <div className="flex items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="피드백 검색..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          총 {table.getFilteredRowModel().rows.length}개의 피드백 중{" "}
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}
          번을 표시합니다.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 