import { Plus, Pencil, Trash2, Save, AlertTriangle, Loader2, Info } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { IngredientFormValues, SupplierOption } from '../schema';
import { formatPrice } from '../utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface IngredientFormFieldsProps {
  form: UseFormReturn<IngredientFormValues>;
  suppliers: SupplierOption[];
  isLoadingSuppliers: boolean;
  handleSupplierSelect: (value: string) => void;
  addNewSupplier: (name: string) => Promise<string | null>;
  updateSupplier?: (id: string, name: string) => Promise<string | null>;
  deleteSupplier?: (id: string) => Promise<boolean>;
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
  updateSupplier,
  deleteSupplier,
  companyId,
  mode = 'create',
  ingredientId
}: IngredientFormFieldsProps) {
  // 디버깅 로그
  useEffect(() => {
    console.log('현재 form 값:', form.getValues());
  }, [form]);

  // 공급업체 수정 관련 상태
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  // 코드명 중복 체크
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeExists, setCodeExists] = useState(false);
  const currentCodeName = form.watch('code_name');
  const initialCodeName = form.getValues().code_name; // 초기 코드명 (편집 모드일 때 사용)
  
  // 현재 선택된 공급업체
  const currentSupplierId = form.watch('supplier_id');

  // 공급업체 수정 모달 열기
  const handleEditSupplierClick = () => {
    if (!currentSupplierId || !updateSupplier) return;
    
    const currentSupplier = suppliers.find(s => s.value === currentSupplierId);
    if (currentSupplier) {
      setSelectedSupplierId(currentSupplier.value);
      setEditSupplierName(currentSupplier.label);
      setIsEditSupplierOpen(true);
    }
  };

  // 공급업체 삭제 모달 열기
  const handleDeleteSupplierClick = () => {
    if (!currentSupplierId || !deleteSupplier) return;
    
    setSelectedSupplierId(currentSupplierId);
    setIsDeleteSupplierOpen(true);
  };

  // 공급업체 수정 처리
  const handleUpdateSupplier = async () => {
    if (!selectedSupplierId || !updateSupplier || !editSupplierName.trim()) return;
    
    setIsEditingSupplier(true);
    try {
      const result = await updateSupplier(selectedSupplierId, editSupplierName.trim());
      if (result) {
        setIsEditSupplierOpen(false);
        setEditSupplierName('');
      }
    } catch (error) {
      console.error('공급업체 수정 오류:', error);
    } finally {
      setIsEditingSupplier(false);
    }
  };

  // 공급업체 삭제 처리
  const handleDeleteSupplier = async () => {
    if (!selectedSupplierId || !deleteSupplier) return;
    
    setIsDeletingSupplier(true);
    try {
      const success = await deleteSupplier(selectedSupplierId);
      if (success) {
        // 삭제 성공 시 폼에서 공급업체 필드 초기화
        form.setValue('supplier_id', '');
        setIsDeleteSupplierOpen(false);
      }
    } catch (error) {
      console.error('공급업체 삭제 오류:', error);
    } finally {
      setIsDeletingSupplier(false);
    }
  };

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
        // 어떤 테이블에서 중복되었는지에 따라 다른 오류 메시지 표시
        let errorMessage = '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.';
        
        if (data.containersExists) {
          errorMessage = '이미 용기 코드명으로 사용 중입니다. 다른 코드명을 사용해주세요.';
        } else if (data.ingredientsExists) {
          errorMessage = '이미 식재료 코드명으로 사용 중입니다. 다른 코드명을 사용해주세요.';
        }
        
        form.setError('code_name', { 
          type: 'manual', 
          message: errorMessage
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
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        handleSupplierSelect(val);
                      }}
                      value={field.value || ""}
                    >
                      <SelectTrigger>
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
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    disabled={!currentSupplierId || !updateSupplier}
                    onClick={handleEditSupplierClick}
                    className="h-9 w-9 shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    disabled={!currentSupplierId || !deleteSupplier}
                    onClick={handleDeleteSupplierClick}
                    className="h-9 w-9 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
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
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                포장당 식재료 양 <span className="text-red-500 ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...rest}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1포장당 양을 입력하세요"
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
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
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="단위 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ea">EA</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
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
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>박스당 포장 갯수</FormLabel>
              <FormControl>
                <Input
                  {...rest}
                  type="number"
                  min="0"
                  placeholder="박스당 포장 갯수를 입력하세요"
                  onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  value={value === 0 ? "" : value || ""}
                  onFocus={(e) => {
                    if (parseInt(e.target.value) === 0) {
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
        name="origin"
        render={({ field: { value, onChange, ...rest } }) => (
          <FormItem>
            <FormLabel>원산지</FormLabel>
            <FormControl>
              <Input 
                {...rest} 
                placeholder="원산지를 입력하세요" 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Accordion type="single" collapsible className="w-full border rounded-md">
        <AccordionItem value="nutrition-info">
          <AccordionTrigger className="px-4 py-2 hover:no-underline">
            <div className="flex items-center">
              <Info className="h-4 w-4 mr-2" />
              <span>영양 정보</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
            <FormField
              control={form.control}
              name="calories"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>칼로리 (kcal)</FormLabel>
                  <FormControl>
                    <Input 
                      {...rest} 
                      type="number" 
                      placeholder="0" 
                      value={value === null || value === undefined ? '' : value}
                      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="protein"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>단백질 (g)</FormLabel>
                  <FormControl>
                    <Input 
                      {...rest} 
                      type="number" 
                      placeholder="0" 
                      value={value === null || value === undefined ? '' : value}
                      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fat"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>지방 (g)</FormLabel>
                  <FormControl>
                    <Input 
                      {...rest} 
                      type="number" 
                      placeholder="0" 
                      value={value === null || value === undefined ? '' : value}
                      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carbs"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>탄수화물 (g)</FormLabel>
                  <FormControl>
                    <Input 
                      {...rest} 
                      type="number" 
                      placeholder="0" 
                      value={value === null || value === undefined ? '' : value}
                      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <FormField
        control={form.control}
        name="allergens"
        render={({ field: { value, onChange, ...rest } }) => (
          <FormItem>
            <FormLabel>알러지 유발물질</FormLabel>
            <FormControl>
              <Textarea 
                {...rest} 
                placeholder="알러지 유발물질을 입력하세요 (예: 밀, 대두, 우유)"
                className="resize-none h-20"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="memo1"
        render={({ field: { value, onChange, ...rest } }) => (
          <FormItem>
            <FormLabel>메모</FormLabel>
            <FormControl>
              <Textarea 
                {...rest} 
                placeholder="추가 정보를 입력하세요"
                className="resize-none h-20"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>공급업체 수정</DialogTitle>
            <DialogDescription>
              공급업체 이름을 수정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <FormLabel htmlFor="edit-supplier-name">공급업체 이름</FormLabel>
              <Input
                id="edit-supplier-name"
                placeholder="공급업체 이름을 입력하세요"
                value={editSupplierName}
                onChange={(e) => setEditSupplierName(e.target.value)}
                disabled={isEditingSupplier}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditSupplierOpen(false);
                setEditSupplierName('');
                setSelectedSupplierId(null);
              }}
              disabled={isEditingSupplier}
            >
              취소
            </Button>
            <Button 
              type="button" 
              onClick={handleUpdateSupplier}
              disabled={!editSupplierName.trim() || isEditingSupplier}
            >
              {isEditingSupplier ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteSupplierOpen} onOpenChange={setIsDeleteSupplierOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공급업체를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 이 공급업체가 다른 식재료에서 사용 중인 경우 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingSupplier}
              onClick={() => {
                setSelectedSupplierId(null);
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              disabled={isDeletingSupplier}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingSupplier ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 