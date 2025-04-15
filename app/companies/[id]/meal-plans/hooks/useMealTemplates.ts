import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MealTemplate {
  id: string;
  name: string;
}

export interface MealTemplateOption {
  label: string;
  value: string;
}

export const useMealTemplates = (companyId: string) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MealTemplateOption[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // 식단 템플릿 목록 로드 함수
  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-templates`);
      
      if (!response.ok) {
        throw new Error('식단 템플릿 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log("식단 템플릿 목록 로드 성공:", data);
      
      const templatesList = data.map((template: MealTemplate) => ({
        label: template.name,
        value: template.id
      }));
      setTemplates(templatesList);
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [companyId]);

  // 컴포넌트 마운트 시 한 번만 로드
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // 새 템플릿 추가 함수
  const addNewTemplate = async (templateName: string, containerSelections: string[] = []) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          container_selections: containerSelections
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 추가에 실패했습니다.');
      }

      const newTemplate = await response.json();
      const newTemplateItem = {
        label: newTemplate.name,
        value: newTemplate.id
      };
      
      setTemplates(prev => [...prev, newTemplateItem]);

      toast({
        title: '템플릿 추가 완료',
        description: `${newTemplate.name} 템플릿이 추가되었습니다.`,
        variant: 'default',
      });

      return newTemplate.id;
    } catch (error) {
      console.error('템플릿 추가 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '템플릿 추가 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // 템플릿 수정 함수
  const updateTemplate = async (templateId: string, templateName: string, containerSelections: string[] = []) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          container_selections: containerSelections
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 수정에 실패했습니다.');
      }

      const updatedTemplate = await response.json();
      
      // 상태 업데이트
      setTemplates(prev => prev.map(template => 
        template.value === templateId 
          ? { label: updatedTemplate.name, value: templateId }
          : template
      ));

      toast({
        title: '템플릿 수정 완료',
        description: `${updatedTemplate.name} 템플릿이 수정되었습니다.`,
        variant: 'default',
      });

      return updatedTemplate.id;
    } catch (error) {
      console.error('템플릿 수정 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '템플릿 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // 템플릿 삭제 함수
  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '템플릿 삭제에 실패했습니다.');
      }

      // 상태에서 템플릿 제거
      setTemplates(prev => prev.filter(template => template.value !== templateId));

      toast({
        title: '템플릿 삭제 완료',
        description: '템플릿이 삭제되었습니다.',
        variant: 'default',
      });

      return true;
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '템플릿 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // template_id로 템플릿 찾기
  const getTemplateById = useCallback((id: string | undefined | null) => {
    if (!id) return null;
    return templates.find(template => template.value === id) || null;
  }, [templates]);

  return {
    templates,
    isLoadingTemplates,
    addNewTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
    getTemplateById
  };
}; 