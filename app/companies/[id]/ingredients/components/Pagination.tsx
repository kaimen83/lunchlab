'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaginationInfo } from "../types";

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  // 페이지 변화가 없거나 범위를 벗어나는 페이지를 요청하는 경우 무시
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return;
    }
    onPageChange(newPage);
  };

  // 페이지네이션이 필요 없는 경우 표시하지 않음
  if (pagination.totalPages <= 1) return null;
  
  // 모바일에서 표시할 페이지 수 조정 (3개만 표시)
  const displayPageCount = typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 5;
  
  // 현재 페이지를 중심으로 표시할 페이지 계산 함수
  const getPageNumbers = () => {
    const result = [];
    
    if (pagination.totalPages <= displayPageCount) {
      // 전체 페이지가 displayPageCount 이하면 모두 표시
      for (let i = 1; i <= pagination.totalPages; i++) {
        result.push(i);
      }
    } else if (pagination.page <= Math.ceil(displayPageCount / 2)) {
      // 현재 페이지가 1~2(모바일) 또는 1~3(데스크톱)이면 1~3(모바일) 또는 1~5(데스크톱) 표시
      for (let i = 1; i <= displayPageCount; i++) {
        result.push(i);
      }
    } else if (pagination.page >= pagination.totalPages - Math.floor(displayPageCount / 2)) {
      // 현재 페이지가 마지막에 가까우면 마지막 3개(모바일) 또는 5개(데스크톱) 표시
      for (let i = pagination.totalPages - displayPageCount + 1; i <= pagination.totalPages; i++) {
        result.push(i);
      }
    } else {
      // 그 외에는 현재 페이지 중심으로 앞뒤로 표시
      const offset = Math.floor(displayPageCount / 2);
      for (let i = pagination.page - offset; i <= pagination.page + offset; i++) {
        if (i > 0 && i <= pagination.totalPages) {
          result.push(i);
        }
      }
      
      // 페이지 수가 맞지 않는 경우 보정
      while (result.length < displayPageCount) {
        if (result[0] > 1) {
          result.unshift(result[0] - 1);
        } else if (result[result.length - 1] < pagination.totalPages) {
          result.push(result[result.length - 1] + 1);
        } else {
          break;
        }
      }
    }
    
    return result;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
      <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
        <span className="hidden sm:inline">전체 {pagination.total}개 중 </span>
        <span>
          {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}
          <span className="sm:hidden"> / {pagination.total}</span>
          <span className="hidden sm:inline">개 표시</span>
        </span>
      </div>
      
      <nav className="flex items-center justify-center sm:justify-end space-x-1 order-1 sm:order-2" aria-label="페이지네이션">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md hidden sm:flex"
          onClick={() => handlePageChange(1)}
          disabled={pagination.page === 1}
          aria-label="첫 페이지"
        >
          <ChevronLeft className="h-3 w-3" />
          <ChevronLeft className="h-3 w-3 -ml-2" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:h-8 sm:w-8 rounded-md"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map(pageNumber => {
            const isCurrentPage = pageNumber === pagination.page;
            
            return (
              <Button
                key={pageNumber}
                variant={isCurrentPage ? "default" : "outline"}
                size="icon"
                className={`h-9 w-9 sm:h-8 sm:w-8 rounded-md ${isCurrentPage ? "pointer-events-none" : ""}`}
                onClick={() => handlePageChange(pageNumber)}
                aria-current={isCurrentPage ? "page" : undefined}
                aria-label={`${pageNumber} 페이지`}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 sm:h-8 sm:w-8 rounded-md"
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md hidden sm:flex"
          onClick={() => handlePageChange(pagination.totalPages)}
          disabled={pagination.page === pagination.totalPages}
          aria-label="마지막 페이지"
        >
          <ChevronRight className="h-3 w-3" />
          <ChevronRight className="h-3 w-3 -ml-2" />
        </Button>
      </nav>
    </div>
  );
};

export default Pagination; 