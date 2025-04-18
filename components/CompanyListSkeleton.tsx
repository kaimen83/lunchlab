import { Skeleton } from "@/components/ui/skeleton";

/**
 * 회사 목록 로딩 상태를 위한 스켈레톤 컴포넌트
 */
export function CompanyListSkeleton() {
  return (
    <div className="space-y-4 mt-8">
      <div className="h-8 w-1/3 bg-muted rounded mx-auto mb-8"></div>
      <div className="h-10 w-full bg-muted rounded mb-6"></div>
      <div className="h-24 w-full bg-muted rounded"></div>
      <div className="h-24 w-full bg-muted rounded"></div>
    </div>
  );
} 