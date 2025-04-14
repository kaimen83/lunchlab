import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IngredientFormValues, SupplierOption } from '../schema';
import { formatPrice } from '../utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

interface IngredientFormFieldsProps {
  form: UseFormReturn<IngredientFormValues>;
  suppliers: SupplierOption[];
  isLoadingSuppliers: boolean;
  handleSupplierSelect: (value: string) => void;
  addNewSupplier: (name: string) => Promise<string | null>;
  companyId: string;
  mode?: 'create' | 'edit';
  ingredientId?: string;
}

export function IngredientFormFields({
  form,
  suppliers,
  isLoadingSuppliers,
  handleSupplierSelect,
  addNewSupplier,
  companyId,
  mode = 'create',
  ingredientId
}: IngredientFormFieldsProps) {
  // 디버깅 로그
  useEffect(() => {
    console.log('현재 form 값:', form.getValues());
  }, [form]);

  // 코드명 중복 체크
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const currentCodeName = form.watch('code_name');
  const initialCodeName = form.getValues().code_name; // 초기 코드명 (편집 모드일 때 사용)
  
  // 실시간 코드명 중복 체크 함수
  const checkCodeName = async (code: string) => {
    if (!code || code.trim() === '') {
      setCodeExists(false);
      form.clearErrors('code_name');
      return;
    }
    
    // 수정 모드에서 코드명이 변경되지 않았다면 중복 체크 필요 없음
    if (mode === 'edit' && code === initialCodeName) {
      setCodeExists(false);
      form.clearErrors('code_name');
      return;
    }
    
    setIsCheckingCode(true);
    try {
      // excludeId 파라미터 추가 (편집 모드에서 현재 아이템 제외)
      const excludeIdParam = mode === 'edit' && ingredientId ? `&excludeId=${ingredientId}` : '';
      
      // fetch 요청으로 코드명 중복 확인
      const response = await fetch(
        `/api/companies/${companyId}/ingredients/check-code?code=${encodeURIComponent(code)}${excludeIdParam}`
      );
      
      if (!response.ok) {
        console.error('[FormFields] 코드명 중복 확인 요청 실패:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('[FormFields] 코드명 중복 체크 결과:', data);
      
      // 중복 여부 설정 및 에러 표시
      setCodeExists(data.exists);
      
      if (data.exists) {
        form.setError('code_name', { 
          type: 'manual', 
          message: '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.' 
        });
      } else {
        form.clearErrors('code_name');
      }
    } catch (error) {
      console.error('[FormFields] 코드명 체크 오류:', error);
    } finally {
      setIsCheckingCode(false);
    }
  };
  
  // 코드명 변경 시 중복 체크 실행 (디바운스 적용)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentCodeName) {
        checkCodeName(currentCodeName);
      } else {
        setCodeExists(false);
        form.clearErrors('code_name');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentCodeName, companyId, initialCodeName, mode, ingredientId, form]);

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center">
              식재료 이름 <span className="text-red-500 ml-1">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder="식재료 이름을 입력하세요" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="code_name"
        render={({ field: { value, onChange, ...fieldProps } }) => (
          <FormItem>
            <FormLabel>코드명</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  {...fieldProps} 
                  value={value || ""} 
                  onChange={(e) => {
                    onChange(e.target.value);
                    console.log('[FormFields] 코드명 변경:', e.target.value);
                  }}
                  placeholder="코드명을 입력하세요" 
                  className={codeExists ? "border-red-500 pr-10" : ""}
                />
                {codeExists && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                )}
              </div>
            </FormControl>
            <div className="mt-1 text-sm">
              {isCheckingCode && <p className="text-muted-foreground">코드명 중복 확인 중...</p>}
              {/* FormMessage에서 이미 에러를 표시하므로 여기서는 표시하지 않음 */}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="supplier_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>식재료 업체</FormLabel>
            <FormControl>
              <div className="space-y-2">
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    handleSupplierSelect(val);
                  }}
                  value={field.value || ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="업체를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length > 0 ? (
                      suppliers.map((supplier) => (
                        <SelectItem 
                          key={supplier.value} 
                          value={supplier.value}
                        >
                          {supplier.label}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="text-center py-2 text-muted-foreground">
                        {isLoadingSuppliers ? "로딩 중..." : "등록된 공급업체가 없습니다."}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                  onClick={async () => {
                    const name = prompt("새 공급업체 이름을 입력하세요");
                    if (name && name.trim()) {
                      const newSupplierId = await addNewSupplier(name.trim());
                      if (newSupplierId) {
                        form.setValue('supplier_id', newSupplierId);
                      }
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> 새 공급업체 추가
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="package_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                포장당 식재료 양 <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1포장당 양을 입력하세요"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  value={field.value === 0 ? "" : field.value}
                  onFocus={(e) => {
                    if (parseFloat(e.target.value) === 0) {
                      e.target.value = "";
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      field.onChange(0);
                    }
                  }}
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
              <FormLabel className="flex items-center">
                단위 <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="단위 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="EA">EA</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="price"
        render={({ field: { value, onChange, ...field } }) => (
          <FormItem>
            <FormLabel className="flex items-center">
              가격 (원) <span className="text-red-500 ml-1">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                value={value === 0 ? "" : formatPrice(value?.toString() || '0')}
                onChange={(e) => {
                  const formatted = e.target.value.replace(/[^\d]/g, '');
                  onChange(formatted ? parseInt(formatted) : 0);
                }}
                placeholder="가격을 입력하세요"
                onFocus={(e) => {
                  if (parseInt(e.target.value.replace(/[^\d]/g, '')) === 0) {
                    e.target.value = "";
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === "") {
                    onChange(0);
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="items_per_box"
          render={({ field }) => (
            <FormItem>
              <FormLabel>박스당 포장 갯수</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="0"
                  placeholder="박스당 포장 갯수를 입력하세요"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  value={field.value === 0 ? "" : field.value || ""}
                  onFocus={(e) => {
                    if (parseInt(e.target.value) === 0) {
                      e.target.value = "";
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      field.onChange(0);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="stock_grade"
        render={({ field }) => (
          <FormItem>
            <FormLabel>재고관리 등급</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="memo1"
        render={({ field }) => (
          <FormItem>
            <FormLabel>메모</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="추가 정보를 입력하세요"
                rows={2}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
} 