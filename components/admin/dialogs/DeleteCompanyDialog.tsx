'use client';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCompanyDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  company: {
    id: string;
    name: string;
  } | null;
  onDelete: (companyId: string) => Promise<void>;
}

export function DeleteCompanyDialog({
  open,
  setOpen,
  company,
  onDelete
}: DeleteCompanyDialogProps) {
  const handleDelete = async () => {
    if (!company) return;
    
    try {
      await onDelete(company.id);
      setOpen(false);
    } catch (error) {
      console.error('Error in delete company dialog:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회사 삭제 확인</DialogTitle>
          <DialogDescription>
            '{company?.name}' 회사를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 회사에 연결된 모든 데이터가 삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            삭제 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 