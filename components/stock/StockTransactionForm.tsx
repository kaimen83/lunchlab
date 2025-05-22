import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { StockItem } from "./StockTable";

// 폼 스키마 정의
const transactionFormSchema = z.object({
  stockItemId: z.string().min(1, { message: "재고 항목을 선택해주세요" }),
  transactionType: z.enum(["in", "out"], {
    required_error: "거래 유형을 선택해주세요",
  }),
  quantity: z.coerce
    .number()
    .positive({ message: "수량은 0보다 커야 합니다" }),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface StockTransactionFormProps {
  companyId: string;
  stockItems: StockItem[];
  isLoading: boolean;
  onSubmit: (data: TransactionFormValues) => Promise<void>;
}

export function StockTransactionForm({
  companyId,
  stockItems,
  isLoading,
  onSubmit,
}: StockTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItemUnit, setSelectedItemUnit] = useState<string>("");

  // 폼 설정
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactionType: "in",
      quantity: 1,
      notes: "",
    },
  });

  // 항목 선택 시 단위 업데이트
  const handleItemChange = (itemId: string) => {
    const selectedItem = stockItems.find((item) => item.id === itemId);
    if (selectedItem) {
      setSelectedItemUnit(selectedItem.unit);
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset({
        transactionType: "in",
        quantity: 1,
        notes: "",
      });
    } catch (error) {
      console.error("거래 생성 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>재고 거래 생성</CardTitle>
          <CardDescription>재고 입고 또는 출고 거래를 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>재고 거래 생성</CardTitle>
        <CardDescription>재고 입고 또는 출고 거래를 생성합니다.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>거래 유형</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "in" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => field.onChange("in")}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        입고
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "out" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => field.onChange("out")}
                      >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        출고
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stockItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>재고 항목</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleItemChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="재고 항목 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stockItems.length === 0 ? (
                        <SelectItem value="none" disabled>
                          등록된 재고 항목이 없습니다
                        </SelectItem>
                      ) : (
                        stockItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.details.name}
                            {item.details.code_name && ` (${item.details.code_name})`} - 현재: {item.current_quantity} {item.unit}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        {...field}
                      />
                      {selectedItemUnit && (
                        <span className="text-sm text-muted-foreground w-10">
                          {selectedItemUnit}
                        </span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="거래에 대한 추가 정보를 입력하세요"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              거래 생성
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 