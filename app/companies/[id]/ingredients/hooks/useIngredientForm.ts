import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Ingredient, IngredientFormValues, ingredientSchema } from '../schema';
import { cleanFormData } from '../utils';

interface UseIngredientFormProps {
  companyId: string;
  ingredient: Ingredient | null;
  mode: 'create' | 'edit';
  onSave: (ingredient: Ingredient) => void;
}

export const useIngredientForm = ({
  companyId,
  ingredient,
  mode,
  onSave
}: UseIngredientFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 초기화
  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: '',
      code_name: '',
      supplier_id: '',
      package_amount: 0,
      unit: 'g',
      price: 0,
      items_per_box: 0,
      stock_grade: '',
      memo1: '',
    },
  });

  // 수정 모드일 경우 초기값 설정
  useEffect(() => {
    if (mode === 'edit' && ingredient) {
      form.reset({
        name: ingredient.name,
        code_name: ingredient.code_name || '',
        supplier_id: ingredient.supplier_id || '',
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        items_per_box: ingredient.items_per_box || 0,
        stock_grade: ingredient.stock_grade || '',
        memo1: ingredient.memo1 || '',
      });
    } else {
      form.reset({
        name: '',
        code_name: '',
        supplier_id: '',
        package_amount: 0,
        unit: 'g',
        price: 0,
        items_per_box: 0,
        stock_grade: '',
        memo1: '',
      });
    }
  }, [mode, ingredient, form]);

  // 공급업체 선택 핸들러
  const handleSupplierSelect = (value: string) => {
    if (value && value.trim() !== '') {
      form.setValue('supplier_id', value);
    } else {
      form.setValue('supplier_id', null);
    }
  };

  // 폼 제출 처리
  const onSubmit = async (data: IngredientFormValues) => {
    setIsSubmitting(true);
    
    try {
      const formData = cleanFormData(data);
      
      const url = mode === 'create'
        ? `/api/companies/${companyId}/ingredients`
        : `/api/companies/${companyId}/ingredients/${ingredient?.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '요청 처리 중 오류가 발생했습니다.');
      }
      
      const savedIngredient = await response.json();
      
      toast({
        title: mode === 'create' ? '식재료 추가 완료' : '식재료 수정 완료',
        description: `${savedIngredient.name} 식재료가 ${mode === 'create' ? '추가' : '수정'}되었습니다.`,
        variant: 'default',
      });
      
      onSave(savedIngredient);
    } catch (error) {
      console.error('식재료 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식재료 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    onSubmit,
    handleSupplierSelect
  };
}; 