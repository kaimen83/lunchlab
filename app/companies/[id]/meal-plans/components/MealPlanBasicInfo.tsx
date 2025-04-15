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
import { CalendarIcon, Loader2, Plus, Search, Save, X } from 'lucide-react';
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
  handleTemplateSelect
}: MealPlanBasicInfoProps) {
  const { templates, isLoadingTemplates, addNewTemplate } = useMealTemplates(companyId);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateContainerSearch, setTemplateContainerSearch] = useState('');
  const [selectedTemplateContainers, setSelectedTemplateContainers] = useState<string[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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
        setName(newTemplateId);

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
            <Select
              value={name}
              onValueChange={(val) => {
                setName(val);
                handleTemplateSelect(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="템플릿을 선택하세요" />
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
              
              <ScrollArea className="h-32 sm:h-40 border rounded-md">
                <div className="p-2">
                  {filteredContainers.length > 0 ? (
                    filteredContainers.map(container => (
                      <div key={container.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id={`container-${container.id}`}
                          checked={selectedContainers.includes(container.id)}
                          onCheckedChange={() => toggleContainerSelection(container.id)}
                        />
                        <div className="flex-1">
                          <label htmlFor={`container-${container.id}`} className="text-sm font-medium cursor-pointer">{container.name}</label>
                          {container.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{container.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">검색 결과가 없습니다</div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
          취소
        </Button>
        {selectedContainers.length > 0 && (
          <Button type="button" onClick={() => setActiveTab("menus")}>
            다음: 메뉴 선택
          </Button>
        )}
      </CardFooter>

      {/* 새 템플릿 추가 모달 */}
      <Dialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 식단 템플릿 추가</DialogTitle>
            <DialogDescription>
              새 식단 템플릿의 이름과 기본 용기를 선택해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">템플릿 이름</Label>
              <Input
                id="template-name"
                placeholder="예: 일반식, 특별식 등"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>기본 용기 선택</Label>
              <p className="text-sm text-muted-foreground mb-2">
                이 템플릿에서 사용할 기본 용기를 선택해주세요
              </p>
              
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="용기 검색..."
                  className="pl-9"
                  value={templateContainerSearch}
                  onChange={(e) => setTemplateContainerSearch(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2">
                  {filteredTemplateContainers.length > 0 ? (
                    filteredTemplateContainers.map(container => (
                      <div key={container.id} className="flex items-start space-x-2 p-2 hover:bg-accent rounded-md">
                        <Checkbox
                          id={`template-container-${container.id}`}
                          checked={selectedTemplateContainers.includes(container.id)}
                          onCheckedChange={() => toggleTemplateContainerSelection(container.id)}
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`template-container-${container.id}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {container.name}
                          </label>
                          {container.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {container.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">검색 결과가 없습니다</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsAddTemplateOpen(false);
                setNewTemplateName('');
                setSelectedTemplateContainers([]);
              }}
              disabled={isSavingTemplate}
            >
              <X className="h-4 w-4 mr-2" /> 취소
            </Button>
            <Button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim() || isSavingTemplate}
            >
              {isSavingTemplate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 