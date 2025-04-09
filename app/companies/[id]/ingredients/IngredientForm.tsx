'use client';

import { useEffect } from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useIngredientForm } from './hooks/useIngredientForm';
import { useSuppliers } from './hooks/useSuppliers';
import { Ingredient } from './schema';
import { IngredientFormFields } from './components/IngredientFormFields';

interface IngredientFormProps {
  companyId: string;
  ingredient: Ingredient | null;
  mode: 'create' | 'edit';
  onSave: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

export default function IngredientForm({
  companyId,
  ingredient,
  mode,
  onSave,
  onCancel,
}: IngredientFormProps) {
  // 디버깅 로그 추가
  useEffect(() => {
    console.log("IngredientForm 렌더링:", { 
      mode, 
      ingredientId: ingredient?.id,
      supplier_id: ingredient?.supplier_id,
      stock_grade: ingredient?.stock_grade
    });
  }, [mode, ingredient]);

  // 공급업체 관련 로직
  const { suppliers, isLoadingSuppliers, addNewSupplier } = useSuppliers(companyId);

  // 폼 관련 로직
  const { form, isSubmitting, onSubmit, handleSupplierSelect } = useIngredientForm({
    companyId,
    ingredient,
    mode,
    onSave
  });

  // 모바일에서 터치 이벤트 문제 해결을 위한 effect
  useEffect(() => {
    // 모달이 열릴 때 body에 overscroll-behavior 속성 추가
    document.body.style.overscrollBehavior = 'contain';
    
    // 컴포넌트 언마운트 시 스타일 속성 제거
    return () => {
      document.body.style.overscrollBehavior = '';
      
      // 추가 정리 작업: 모든 이벤트 리스너가 제대로 정리되도록 함
      document.body.style.touchAction = 'auto';
      document.documentElement.style.touchAction = 'auto';
    };
  }, []);

  // 안전한 취소 처리
  const handleCancel = () => {
    // form 상태 리셋
    form.reset();
    // 부모 컴포넌트의 onCancel 호출 전 약간의 지연 추가
    setTimeout(() => {
      onCancel();
    }, 10);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <IngredientFormFields 
          form={form}
          suppliers={suppliers}
          isLoadingSuppliers={isLoadingSuppliers}
          handleSupplierSelect={handleSupplierSelect}
          addNewSupplier={addNewSupplier}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleCancel} 
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center">
                <PackageOpen className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </span>
            ) : (
              mode === 'create' ? '추가하기' : '수정하기'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 