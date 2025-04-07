"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RegisterModuleButtonProps {
  moduleId: string;
}

export function RegisterModuleButton({ moduleId }: RegisterModuleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/modules/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moduleId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "모듈 등록에 실패했습니다.");
      }

      toast.success("모듈이 마켓플레이스에 등록되었습니다.");
    } catch (error) {
      console.error("모듈 등록 오류:", error);
      toast.error("모듈 등록에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRegister}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          등록 중...
        </>
      ) : (
        "마켓플레이스에 등록"
      )}
    </Button>
  );
} 