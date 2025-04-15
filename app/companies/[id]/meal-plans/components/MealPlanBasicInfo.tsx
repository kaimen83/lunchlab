'use client';

import { Dispatch, SetStateAction } from 'react';
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
import { CalendarIcon, Loader2, Plus, Search } from 'lucide-react';
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
              onClick={async () => {
                const name = prompt("새 템플릿 이름을 입력하세요");
                if (name && name.trim()) {
                  const newTemplateId = await addNewTemplate(name.trim());
                  if (newTemplateId) {
                    setName(newTemplateId);
                  }
                }
              }}
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
    </Card>
  );
} 