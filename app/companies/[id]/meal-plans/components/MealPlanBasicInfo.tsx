'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus, Search, Pencil, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Container } from './types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useMealTemplates } from '../hooks/useMealTemplates';

interface MealPlanBasicInfoProps {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  date: Date | undefined;
  setDate: Dispatch<SetStateAction<Date | undefined>>;
  mealTime: 'breakfast' | 'lunch' | 'dinner';
  setMealTime: Dispatch<SetStateAction<'breakfast' | 'lunch' | 'dinner'>>;
  containerSearchTerm: string;
  setContainerSearchTerm: Dispatch<SetStateAction<string>>;
  selectedContainers: string[];
  toggleContainerSelection: (containerId: string) => void;
  filteredContainers: Container[];
  isLoading: boolean;
  isLoadingContainers: boolean;
  onCancel: () => void;
  setActiveTab: Dispatch<SetStateAction<string>>;
  companyId: string;
  handleTemplateSelect: (value: string) => void;
  selectedTemplate: { id: string; name: string } | null;
  setSelectedTemplate: (template: { id: string; name: string } | null) => void;
}

export default function MealPlanBasicInfo({
  name,
  setName,
  date,
  setDate,
  mealTime,
  setMealTime,
  containerSearchTerm,
  setContainerSearchTerm,
  selectedContainers,
  toggleContainerSelection,
  filteredContainers,
  isLoading,
  isLoadingContainers,
  onCancel,
  setActiveTab,
  companyId,
  handleTemplateSelect,
  selectedTemplate,
  setSelectedTemplate
}: MealPlanBasicInfoProps) {
  const { templates, isLoadingTemplates, addNewTemplate, updateTemplate, deleteTemplate } = useMealTemplates(companyId);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editTemplateName, setEditTemplateName] = useState('');
  const [templateContainerSearch, setTemplateContainerSearch] = useState('');
  const [selectedTemplateContainers, setSelectedTemplateContainers] = useState<string[]>([]);
  const [editTemplateContainerSearch, setEditTemplateContainerSearch] = useState('');
  const [selectedEditTemplateContainers, setSelectedEditTemplateContainers] = useState<string[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplateDetails, setIsLoadingTemplateDetails] = useState(false);

  const filteredTemplateContainers = filteredContainers.filter(container => 
    container.name.toLowerCase().includes(templateContainerSearch.toLowerCase()) ||
    (container.description && container.description.toLowerCase().includes(templateContainerSearch.toLowerCase()))
  );

  const toggleTemplateContainerSelection = (containerId: string) => {
    setSelectedTemplateContainers(prev => 
      prev.includes(containerId) 
        ? prev.filter(id => id !== containerId) 
        : [...prev, containerId]
    );
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    
    setIsSavingTemplate(true);
    try {
      const newTemplateId = await addNewTemplate(newTemplateName.trim(), selectedTemplateContainers);
      if (newTemplateId) {
        // 템플릿 ID가 아닌 템플릿 이름을 식단 이름으로 설정
        setName(newTemplateName.trim());

        // 템플릿과 함께 선택된 용기도 저장해야 하지만,
        // 현재 API에는 이 기능이 없으므로 템플릿 ID만 반환하고
        // 메인 컴포넌트에서 선택된 용기 설정을 호출
        handleTemplateSelect(newTemplateId);
        
        // 용기 정보도 선택에 반영
        if (selectedTemplateContainers.length > 0) {
          // 템플릿 선택 시 모든 용기들이 자동 선택됨
          selectedTemplateContainers.forEach(containerId => {
            if (!selectedContainers.includes(containerId)) {
              toggleContainerSelection(containerId);
            }
          });
        }
      }
      setIsAddTemplateOpen(false);
      setNewTemplateName('');
      setSelectedTemplateContainers([]);
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplateId || !editTemplateName.trim()) return;
    
    setIsEditingTemplate(true);
    try {
      const updatedTemplateId = await updateTemplate(
        selectedTemplateId, 
        editTemplateName.trim(),
        selectedEditTemplateContainers
      );
      
      if (updatedTemplateId) {
        // 현재 선택된 템플릿이 수정되는 템플릿인 경우, 업데이트된 이름 반영
        if (selectedTemplate && selectedTemplate.id === selectedTemplateId) {
          setSelectedTemplate({
            id: selectedTemplateId,
            name: editTemplateName.trim()
          });
          // 식단 이름도 업데이트
          setName(editTemplateName.trim());
        }
        
        // 현재 선택된 용기와 수정된 용기를 비교하여 동기화
        const currentSelectedContainers = new Set(selectedContainers);
        const updatedContainers = new Set(selectedEditTemplateContainers);
        
        // 제거된 용기 처리
        selectedContainers.forEach(containerId => {
          if (!updatedContainers.has(containerId)) {
            toggleContainerSelection(containerId);
          }
        });
        
        // 추가된 용기 처리
        selectedEditTemplateContainers.forEach(containerId => {
          if (!currentSelectedContainers.has(containerId)) {
            toggleContainerSelection(containerId);
          }
        });
      }
      setIsEditTemplateOpen(false);
      setEditTemplateName('');
      setSelectedEditTemplateContainers([]);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error('템플릿 수정 오류:', error);
    } finally {
      setIsEditingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    
    setIsDeletingTemplate(true);
    try {
      const success = await deleteTemplate(selectedTemplateId);
      if (success) {
        // 현재 선택된 템플릿이 삭제되는 템플릿인 경우, 선택 초기화
        if (selectedTemplate && selectedTemplate.id === selectedTemplateId) {
          setSelectedTemplate(null);
          setName('');
        }
      }
      setIsDeleteAlertOpen(false);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const fetchTemplateDetails = async (templateId: string) => {
    setIsLoadingTemplateDetails(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/meal-templates/${templateId}`);
      
      if (!response.ok) {
        throw new Error('템플릿 정보를 가져오는데 실패했습니다.');
      }
      
      const templateData = await response.json();
      console.log("템플릿 상세 정보:", templateData);
      
      // 템플릿 이름 설정
      setEditTemplateName(templateData.name);
      
      // 선택된 용기 설정
      const containerIds = templateData.template_selections
        ? templateData.template_selections.map((selection: any) => selection.container_id)
        : [];
      
      setSelectedEditTemplateContainers(containerIds);
    } catch (error) {
      console.error('템플릿 상세 정보 로드 오류:', error);
    } finally {
      setIsLoadingTemplateDetails(false);
    }
  };

  const handleEditClick = () => {
    const selectedTemplate = templates.find(t => t.value === name);
    if (selectedTemplate) {
      setSelectedTemplateId(selectedTemplate.value);
      // 템플릿 상세 정보 로드 (용기 선택 정보 포함)
      fetchTemplateDetails(selectedTemplate.value);
      setIsEditTemplateOpen(true);
    }
  };

  const handleDeleteClick = () => {
    const selectedTemplate = templates.find(t => t.value === name);
    if (selectedTemplate) {
      setSelectedTemplateId(selectedTemplate.value);
      setIsDeleteAlertOpen(true);
    }
  };

  const toggleEditTemplateContainerSelection = (containerId: string) => {
    setSelectedEditTemplateContainers(prev => 
      prev.includes(containerId) 
        ? prev.filter(id => id !== containerId) 
        : [...prev, containerId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>식단 기본 정보</CardTitle>
        <CardDescription>식단의 기본 정보를 입력해주세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">식단 이름</Label>
          <div className="space-y-2">
            <div className="grid w-full gap-1.5">
              <Label>템플릿 사용</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedTemplate?.id || ''}
                    onValueChange={(val) => {
                      // 템플릿 선택시 템플릿 ID를 임시 저장하고, handleTemplateSelect에서 이름을 설정
                      const selectedTemplate = templates.find(t => t.value === val);
                      if (selectedTemplate) {
                        handleTemplateSelect(val);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="템플릿을 선택하세요">
                        {selectedTemplate?.id ? templates.find(t => t.value === selectedTemplate.id)?.label : "템플릿을 선택하세요"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length > 0 ? (
                        templates.map((template) => (
                          <SelectItem 
                            key={template.value} 
                            value={template.value}
                          >
                            {template.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-center py-2 text-muted-foreground">
                          {isLoadingTemplates ? "로딩 중..." : "등록된 템플릿이 없습니다."}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              className="w-full"
              disabled={isLoading}
              onClick={() => setIsAddTemplateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> 새 템플릿 추가
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>날짜</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meal-time">식사 시간</Label>
            <Select
              value={mealTime}
              onValueChange={(value) => setMealTime(value as 'breakfast' | 'lunch' | 'dinner')}
              disabled={isLoading}
            >
              <SelectTrigger id="meal-time">
                <SelectValue placeholder="식사 시간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">아침</SelectItem>
                <SelectItem value="lunch">점심</SelectItem>
                <SelectItem value="dinner">저녁</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>용기 선택</Label>
          <p className="text-sm text-muted-foreground mb-2">이 식단에서 사용할 용기를 모두 선택해주세요</p>
          {isLoadingContainers ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="용기 검색..."
                  className="pl-9"
                  value={containerSearchTerm}
                  onChange={(e) => setContainerSearchTerm(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredContainers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    filteredContainers.map((container) => (
                      <div key={container.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`container-${container.id}`}
                          checked={selectedContainers.includes(container.id)}
                          onCheckedChange={() => toggleContainerSelection(container.id)}
                          disabled={isLoading}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`container-${container.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {container.name}
                          </label>
                          {container.description && (
                            <p className="text-sm text-muted-foreground">
                              {container.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isLoading || !name || !date || selectedContainers.length === 0}
            onClick={() => setActiveTab('menus')}
          >
            다음: 메뉴 선택
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </CardContent>
      
      {/* 새 템플릿 추가 모달 */}
      <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 식단 템플릿 추가</DialogTitle>
            <DialogDescription>
              새로운 식단 템플릿을 만들고 자주 사용하는 용기를 미리 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">템플릿 이름</Label>
              <Input
                id="template-name"
                placeholder="예: 일반 식단, 회의용 식단, 이벤트 식단 등"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                disabled={isSavingTemplate}
              />
            </div>
            
            <div className="space-y-2">
              <Label>기본 용기 선택 (선택 사항)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                이 템플릿에서 기본으로 포함될 용기를 선택하세요
              </p>
              
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="용기 검색..."
                  className="pl-9"
                  value={templateContainerSearch}
                  onChange={(e) => setTemplateContainerSearch(e.target.value)}
                  disabled={isSavingTemplate}
                />
              </div>
              
              <ScrollArea className="h-[150px] border rounded-md">
                <div className="p-4 space-y-2">
                  {filteredTemplateContainers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    filteredTemplateContainers.map((container) => (
                      <div key={container.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`template-container-${container.id}`}
                          checked={selectedTemplateContainers.includes(container.id)}
                          onCheckedChange={() => toggleTemplateContainerSelection(container.id)}
                          disabled={isSavingTemplate}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`template-container-${container.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {container.name}
                          </label>
                          {container.description && (
                            <p className="text-sm text-muted-foreground">
                              {container.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddTemplateOpen(false);
                setNewTemplateName('');
                setSelectedTemplateContainers([]);
              }}
              disabled={isSavingTemplate}
            >
              취소
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim() || isSavingTemplate}
            >
              {isSavingTemplate ? (
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
      
      {/* 템플릿 수정 모달 */}
      <Dialog open={isEditTemplateOpen} onOpenChange={setIsEditTemplateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>식단 템플릿 수정</DialogTitle>
            <DialogDescription>
              식단 템플릿 이름과 포함할 용기를 수정하세요.
            </DialogDescription>
          </DialogHeader>
          {isLoadingTemplateDetails ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-template-name">템플릿 이름</Label>
                <Input
                  id="edit-template-name"
                  placeholder="템플릿 이름을 입력하세요"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  disabled={isEditingTemplate}
                />
              </div>
              
              <div className="space-y-2">
                <Label>포함할 용기 선택</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  이 템플릿에 포함할 용기를 선택하세요
                </p>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="용기 검색..."
                    className="pl-9"
                    value={editTemplateContainerSearch}
                    onChange={(e) => setEditTemplateContainerSearch(e.target.value)}
                    disabled={isEditingTemplate}
                  />
                </div>
                
                <ScrollArea className="h-[150px] border rounded-md">
                  <div className="p-4 space-y-2">
                    {filteredContainers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredContainers
                        .filter(container => 
                          container.name.toLowerCase().includes(editTemplateContainerSearch.toLowerCase()) ||
                          (container.description && container.description.toLowerCase().includes(editTemplateContainerSearch.toLowerCase()))
                        )
                        .map((container) => (
                          <div key={container.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`edit-template-container-${container.id}`}
                              checked={selectedEditTemplateContainers.includes(container.id)}
                              onCheckedChange={() => toggleEditTemplateContainerSelection(container.id)}
                              disabled={isEditingTemplate}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`edit-template-container-${container.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {container.name}
                              </label>
                              {container.description && (
                                <p className="text-sm text-muted-foreground">
                                  {container.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditTemplateOpen(false);
                setEditTemplateName('');
                setSelectedEditTemplateContainers([]);
                setSelectedTemplateId(null);
              }}
              disabled={isEditingTemplate || isLoadingTemplateDetails}
            >
              취소
            </Button>
            <Button 
              type="button" 
              onClick={handleEditTemplate}
              disabled={!editTemplateName.trim() || isEditingTemplate || isLoadingTemplateDetails}
            >
              {isEditingTemplate ? (
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
      
      {/* 템플릿 삭제 확인 모달 */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 템플릿을 삭제하면 연결된 모든 정보가 영구적으로 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingTemplate}
              onClick={() => {
                setSelectedTemplateId(null);
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeletingTemplate}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingTemplate ? (
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
    </Card>
  );
} 