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
  const [formInitialized, setFormInitialized] = useState(false);
  const [isCheckingCodeDuplicate, setIsCheckingCodeDuplicate] = useState(false);

  // 폼 초기화 - defaultValues를 모드에 따라 설정
  const defaultValues = mode === 'edit' && ingredient 
    ? {
        name: ingredient.name,
        code_name: ingredient.code_name || '',
        supplier_id: ingredient.supplier_id || '',
        package_amount: ingredient.package_amount,
        unit: ingredient.unit,
        price: ingredient.price,
        items_per_box: ingredient.items_per_box || 0,
        stock_grade: ingredient.stock_grade || '',
        memo1: ingredient.memo1 || '',
      }
    : {
        name: '',
        code_name: '',
        supplier_id: '',
        package_amount: 0,
        unit: 'g',
        price: 0,
        items_per_box: 0,
        stock_grade: '',
        memo1: '',
      };

  // 폼 생성
  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues,
  });

  // 수정 모드일 경우 초기값 설정 - 컴포넌트 마운트 시 한번만 실행
  useEffect(() => {
    if (!formInitialized) {
      if (mode === 'edit' && ingredient) {
        console.log("수정 모드 폼 초기화:", {
          name: ingredient.name,
          code_name: ingredient.code_name,
          supplier_id: ingredient.supplier_id,
          stock_grade: ingredient.stock_grade
        });

        // 모든 필드를 명시적으로 설정
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
      }
      setFormInitialized(true);
    }
  }, [mode, ingredient, form, formInitialized]);

  // 공급업체 선택 핸들러
  const handleSupplierSelect = (value: string) => {
    if (value && value.trim() !== '') {
      form.setValue('supplier_id', value);
    } else {
      form.setValue('supplier_id', null);
    }
  };

  // 코드명 중복 확인
  const checkCodeExists = async (code: string): Promise<boolean> => {
    if (!code || code.trim() === '') return false;
    
    // 수정 모드에서 코드명이 변경되지 않았다면 중복 체크 필요 없음
    if (mode === 'edit' && ingredient && code === ingredient.code_name) {
      console.log('[Hook] 수정 모드이고 코드명이 변경되지 않았으므로 중복 체크 생략:', { 
        code, 
        originalCode: ingredient.code_name
      });
      return false;
    }
    
    setIsCheckingCodeDuplicate(true);
    try {
      // excludeId 파라미터 추가 - 수정 모드일 때 현재 아이템 제외
      const excludeIdParam = mode === 'edit' && ingredient?.id ? `&excludeId=${ingredient.id}` : '';
      const response = await fetch(
        `/api/companies/${companyId}/ingredients/check-code?code=${encodeURIComponent(code)}${excludeIdParam}`
      );
      
      if (!response.ok) {
        console.error('[Hook] 코드명 중복 확인 실패:', response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('[Hook] 코드명 중복 확인 결과:', data);
      return data.exists;
    } catch (error) {
      console.error('[Hook] 코드명 중복 확인 오류:', error);
      return false;
    } finally {
      setIsCheckingCodeDuplicate(false);
    }
  };

  // 폼 제출 처리
  const onSubmit = async (data: IngredientFormValues) => {
    setIsSubmitting(true);
    
    try {
      // 코드명 중복 확인
      if (data.code_name && data.code_name.trim() !== '') {
        // 수정 모드에서 코드명이 변경되지 않은 경우 중복 체크 생략
        const shouldCheckDuplicate = 
          mode !== 'edit' || 
          (mode === 'edit' && ingredient && data.code_name !== ingredient.code_name);
        
        if (shouldCheckDuplicate) {
          console.log('[Hook] 코드명 중복 확인 시작:', { 
            code_name: data.code_name, 
            mode, 
            ingredient_id: ingredient?.id,
            original_code: ingredient?.code_name
          });
          
          const exists = await checkCodeExists(data.code_name);
          
          if (exists) {
            console.log('[Hook] 코드명 중복 발견! 폼 제출 중단');
            form.setError('code_name', { 
              type: 'manual', 
              message: '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.' 
            });
            
            // 오류 토스트 표시
            toast({
              title: '코드명 중복 오류',
              description: '이미 사용 중인 코드명입니다. 다른 코드명을 입력해주세요.',
              variant: 'destructive',
            });
            
            setIsSubmitting(false);
            return;
          }
        } else {
          console.log('[Hook] 수정 모드에서 코드명이 변경되지 않았으므로 중복 체크 생략');
        }
      }
      
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
        
        // 코드명 중복 오류인지 확인
        if (errorData.code === 'DUPLICATE_CODE_NAME' || errorData.message?.includes('중복') || errorData.message?.includes('이미 사용 중')) {
          form.setError('code_name', { 
            type: 'manual', 
            message: '이미 사용 중인 코드명입니다. 다른 코드명을 사용해주세요.' 
          });
          
          throw new Error('이미 사용 중인 코드명입니다. 다른 코드명을 입력해주세요.');
        }
        
        throw new Error(errorData.error || errorData.message || '요청 처리 중 오류가 발생했습니다.');
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
        title: '저장 실패',
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
    handleSupplierSelect,
    isCheckingCodeDuplicate
  };
}; 