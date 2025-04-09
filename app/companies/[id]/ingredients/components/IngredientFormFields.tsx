import { Plus } from 'lucide-react';
import { useEffect } from 'react';
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

interface IngredientFormFieldsProps {
  form: UseFormReturn<IngredientFormValues>;
  suppliers: SupplierOption[];
  isLoadingSuppliers: boolean;
  handleSupplierSelect: (value: string) => void;
  addNewSupplier: (name: string) => Promise<string | null>;
}

export function IngredientFormFields({
  form,
  suppliers,
  isLoadingSuppliers,
  handleSupplierSelect,
  addNewSupplier
}: IngredientFormFieldsProps) {
  // 폼에 설정된 현재 값을 로깅하여 디버깅
  useEffect(() => {
    console.log('현재 form 값:', form.getValues());
  }, [form]);

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>식재료 이름</FormLabel>
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
              <Input 
                {...fieldProps} 
                value={value || ""} 
                onChange={(e) => onChange(e.target.value)}
                placeholder="코드명을 입력하세요" 
              />
            </FormControl>
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
              <FormLabel>포장량</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="포장량을 입력하세요"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  value={field.value}
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
            <FormLabel>가격 (원)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={formatPrice(value?.toString() || '0')}
                onChange={(e) => {
                  const formatted = e.target.value.replace(/[^\d]/g, '');
                  onChange(formatted ? parseInt(formatted) : 0);
                }}
                placeholder="가격을 입력하세요"
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
              <FormLabel>박스당 갯수</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min="0"
                  placeholder="박스당 갯수를 입력하세요"
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  value={field.value || 0}
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