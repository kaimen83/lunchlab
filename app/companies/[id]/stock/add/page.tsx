"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Package, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// 폼 스키마 정의
const stockItemSchema = z.object({
  itemType: z.enum(["ingredient", "container"], {
    required_error: "항목 유형을 선택해주세요",
  }),
  itemId: z.string().min(1, { message: "연결할 항목을 선택해주세요" }),
  initialQuantity: z.coerce
    .number()
    .min(0, { message: "초기 수량은 0 이상이어야 합니다" }),
  unit: z.string().min(1, { message: "단위를 입력해주세요" }),
  notes: z.string().optional(),
});

type StockItemFormValues = z.infer<typeof stockItemSchema>;

interface AddStockItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AddStockItemPage({ params }: AddStockItemPageProps) {
  const resolvedParams = use(params);
  const { id: companyId } = resolvedParams;
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemType, setSelectedItemType] = useState<"ingredient" | "container" | null>(null);

  // 폼 설정
  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: {
      itemType: "ingredient",
      initialQuantity: 0,
      unit: "",
      notes: "",
    },
  });

  // 항목 유형 변경 시 초기화
  const handleItemTypeChange = (value: "ingredient" | "container") => {
    form.setValue("itemType", value);
    form.setValue("itemId", "");
    form.setValue("unit", "");
    setSelectedItemType(value);
    
    // 식자재인 경우 자동으로 단위 가져오기
    if (value === "ingredient" && ingredients.length > 0) {
      const defaultIngredient = ingredients[0];
      if (defaultIngredient?.unit) {
        form.setValue("unit", defaultIngredient.unit);
      }
    }
  };

  // 식자재 또는 용기 선택 시 단위 업데이트
  const handleItemSelection = (value: string) => {
    const itemType = form.getValues("itemType");
    
    if (itemType === "ingredient") {
      const selected = ingredients.find(item => item.id === value);
      if (selected?.unit) {
        form.setValue("unit", selected.unit);
      }
    }
  };

  // 식자재 목록 가져오기
  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/inventory/ingredients?query=${searchQuery}`);
      
      if (!response.ok) {
        throw new Error("식자재 목록을 가져오는데 실패했습니다");
      }
      
      const data = await response.json();
      setIngredients(data.ingredients || []);
    } catch (error) {
      console.error("식자재 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: "식자재 목록을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 용기 목록 가져오기
  const fetchContainers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/inventory/containers?query=${searchQuery}`);
      
      if (!response.ok) {
        throw new Error("용기 목록을 가져오는데 실패했습니다");
      }
      
      const data = await response.json();
      setContainers(data.containers || []);
    } catch (error) {
      console.error("용기 로딩 오류:", error);
      toast({
        title: "오류 발생",
        description: "용기 목록을 가져오는 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 항목 유형 변경 시 관련 데이터 가져오기
  useEffect(() => {
    if (selectedItemType === "ingredient") {
      fetchIngredients();
    } else if (selectedItemType === "container") {
      fetchContainers();
    }
  }, [selectedItemType, searchQuery]);

  // 초기 데이터 로딩
  useEffect(() => {
    // 페이지 로드 시 기본값인 식자재 데이터 로드
    fetchIngredients();
    setSelectedItemType("ingredient");
  }, []);

  // 폼 제출 핸들러
  const handleSubmit = async (data: StockItemFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/stock/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType: data.itemType,
          itemId: data.itemId,
          initialQuantity: data.initialQuantity,
          unit: data.unit,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "재고 항목 생성에 실패했습니다");
      }

      const responseData = await response.json();

      toast({
        title: "재고 항목이 생성되었습니다",
        description: "재고 항목이 성공적으로 추가되었습니다.",
      });

      // 생성된 항목 페이지로 이동
      router.push(`/companies/${companyId}/stock/items/${responseData.item.id}`);
    } catch (error) {
      console.error("재고 항목 생성 오류:", error);
      toast({
        title: "재고 항목 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로
        </Button>
        <h1 className="text-2xl font-bold">새 재고 항목 추가</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>재고 항목 정보</CardTitle>
          <CardDescription>
            추적할 새 재고 항목의 정보를 입력하세요. 식자재 또는 용기를 재고 항목으로 등록할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="itemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>항목 유형</FormLabel>
                    <Select
                      onValueChange={(value: "ingredient" | "container") => 
                        handleItemTypeChange(value)
                      }
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="항목 유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ingredient">식자재</SelectItem>
                        <SelectItem value="container">용기</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="searchQuery">항목 검색</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="searchQuery"
                        placeholder="이름으로 검색..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => selectedItemType === "ingredient" ? fetchIngredients() : fetchContainers()}
                  >
                    검색
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedItemType === "ingredient" ? "식자재" : "용기"} 선택
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleItemSelection(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="항목 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2">로딩 중...</span>
                            </div>
                          ) : selectedItemType === "ingredient" ? (
                            ingredients.length > 0 ? (
                              ingredients.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} {item.code_name && `(${item.code_name})`}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-muted-foreground">
                                등록된 식자재가 없습니다
                              </div>
                            )
                          ) : (
                            containers.length > 0 ? (
                              containers.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} {item.code_name && `(${item.code_name})`}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-muted-foreground">
                                등록된 용기가 없습니다
                              </div>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="initialQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>초기 수량</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>단위</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="재고 항목에 대한 추가 정보를 입력하세요"
                        className="resize-none h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  저장
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 