'use client';

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
  // 공급업체 관련 로직
  const { suppliers, isLoadingSuppliers, addNewSupplier } = useSuppliers(companyId);

  // 폼 관련 로직
  const { form, isSubmitting, onSubmit, handleSupplierSelect } = useIngredientForm({
    companyId,
    ingredient,
    mode,
    onSave
  });

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
          <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
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