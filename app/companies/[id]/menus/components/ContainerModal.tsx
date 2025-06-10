'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, Package, Folder } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// 컨테이너 데이터 타입 (계층 구조 지원)
export interface Container {
  id: string;
  name: string;
  code_name?: string;
  description?: string;
  price?: number;
  company_id: string;
  container_type: 'group' | 'item';
  parent_container_id?: string;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  children?: Container[]; // 하위 용기들
  level?: number; // 계층 레벨
  path?: string; // 경로 (예: "냄비 > 냄비A")
}

// 폼 스키마 (계층 구조 지원)
const containerSchema = z.object({
  name: z.string().min(1, { message: '용기 이름은 필수입니다.' }),
  code_name: z.string().max(50, { message: '코드명은 50자 이하여야 합니다.' }).optional(),
  description: z.string().max(200, { message: '설명은 200자 이하여야 합니다.' }).optional(),
  price: z.union([
    z.number().nonnegative({ message: '가격은 0 이상이어야 합니다.' }),
    z.undefined(),
    z.null()
  ]).optional(),
  container_type: z.enum(['group', 'item'], { message: '용기 타입을 선택해주세요.' }),
  parent_container_id: z.string().optional(),
  sort_order: z.number().optional().default(0),
});

type ContainerFormData = z.infer<typeof containerSchema>;

interface ContainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  container?: Container;
  onSuccess: () => void;
  parentGroupId?: string; // 특정 그룹에 추가할 때 사용
  availableGroups?: Container[]; // 선택 가능한 그룹 목록
}

export default function ContainerModal({
  open,
  onOpenChange,
  companyId,
  container,
  onSuccess,
  parentGroupId,
  availableGroups = [],
}: ContainerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [codeNameChecking, setCodeNameChecking] = useState(false);
  const [codeNameError, setCodeNameError] = useState<string | null>(null);

  const isEditing = !!container;
  const isAddingToGroup = !!parentGroupId;

  const form = useForm<ContainerFormData>({
    resolver: zodResolver(containerSchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: '',
      code_name: '',
      description: '',
      price: undefined,
      container_type: isAddingToGroup ? 'item' : 'item', // 그룹에 추가할 때는 기본적으로 item
      parent_container_id: parentGroupId || '',
      sort_order: 0,
    },
  });

  // 폼 초기화
  useEffect(() => {
    if (open) {
      if (isEditing && container) {
        // 편집 모드
        form.reset({
          name: container.name,
          code_name: container.code_name || '',
          description: container.description || '',
          price: container.price || undefined,
          container_type: container.container_type,
          parent_container_id: container.parent_container_id || '',
          sort_order: container.sort_order,
        });
      } else {
        // 추가 모드
        form.reset({
          name: '',
          code_name: '',
          description: '',
          price: undefined,
          container_type: isAddingToGroup ? 'item' : 'item',
          parent_container_id: parentGroupId || '',
          sort_order: 0,
        });
      }
      setCodeNameError(null);
    }
  }, [open, container, isEditing, form, parentGroupId, isAddingToGroup]);

  // 코드명 중복 체크
  const checkCodeName = async (codeName: string, containerType: 'group' | 'item') => {
    if (!codeName.trim()) {
      setCodeNameError(null);
      return;
    }

    setCodeNameChecking(true);
    try {
      const excludeId = isEditing ? container?.id : undefined;
      const response = await fetch(
        `/api/companies/${companyId}/containers/check-code?code=${encodeURIComponent(codeName)}&type=${containerType}${excludeId ? `&excludeId=${excludeId}` : ''}`
      );

      if (!response.ok) {
        throw new Error('코드명 중복 체크에 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.exists) {
        setCodeNameError(`이미 사용 중인 코드명입니다. (${data.existingContainer.name})`);
      } else {
        setCodeNameError(null);
      }
    } catch (error) {
      console.error('코드명 중복 체크 오류:', error);
      setCodeNameError('코드명 중복 체크 중 오류가 발생했습니다.');
    } finally {
      setCodeNameChecking(false);
    }
  };

  // 코드명 변경 시 중복 체크
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'code_name' || name === 'container_type') {
        const codeName = value.code_name;
        const containerType = value.container_type;
        
        if (codeName && containerType) {
          const timeoutId = setTimeout(() => {
            checkCodeName(codeName, containerType);
          }, 500); // 500ms 디바운스
          
          return () => clearTimeout(timeoutId);
        } else {
          setCodeNameError(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch, companyId, isEditing, container?.id]);

  // 폼 제출
  const onSubmit = async (data: ContainerFormData) => {
    // 코드명 중복 체크 오류가 있으면 제출 방지
    if (codeNameError) {
      toast({
        title: '오류',
        description: '코드명 중복을 해결해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const url = isEditing 
        ? `/api/companies/${companyId}/containers/${container!.id}`
        : `/api/companies/${companyId}/containers`;
      
      const method = isEditing ? 'PUT' : 'POST';

      // 가격이 빈 문자열이면 null로 변환
      const submitData = {
        ...data,
        price: data.price || null,
        code_name: data.code_name?.trim() || null,
        description: data.description?.trim() || null,
        parent_container_id: data.parent_container_id || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `용기 ${isEditing ? '수정' : '추가'}에 실패했습니다.`);
      }

      toast({
        title: `용기 ${isEditing ? '수정' : '추가'} 완료`,
        description: `${data.name} ${data.container_type === 'group' ? '그룹' : '용기'}이 ${isEditing ? '수정' : '추가'}되었습니다.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(`용기 ${isEditing ? '수정' : '추가'} 오류:`, error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : `용기 ${isEditing ? '수정' : '추가'}에 실패했습니다.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const containerType = form.watch('container_type');
  const selectedParentId = form.watch('parent_container_id');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {containerType === 'group' ? (
              <Folder className="h-5 w-5 text-blue-600" />
            ) : (
              <Package className="h-5 w-5 text-primary" />
            )}
            {isEditing ? '용기 수정' : '용기 추가'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `${container?.name} ${container?.container_type === 'group' ? '그룹' : '용기'}의 정보를 수정합니다.`
              : isAddingToGroup
                ? `선택한 그룹에 새 용기를 추가합니다.`
                : '새로운 그룹 또는 용기를 추가합니다.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 용기 타입 선택 (추가 모드에서만) */}
            {!isEditing && !isAddingToGroup && (
              <FormField
                control={form.control}
                name="container_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-medium">용기 타입</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value="group" id="group" />
                          <Label htmlFor="group" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Folder className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">그룹</div>
                              <div className="text-sm text-muted-foreground">용기들을 분류하는 그룹을 만듭니다</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value="item" id="item" />
                          <Label htmlFor="item" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Package className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium">개별 용기</div>
                              <div className="text-sm text-muted-foreground">실제 사용할 용기를 추가합니다</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 부모 그룹 선택 (item 타입일 때만) */}
            {containerType === 'item' && !isAddingToGroup && availableGroups.length > 0 && (
              <FormField
                control={form.control}
                name="parent_container_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부모 그룹 (선택사항)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="그룹을 선택하세요 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">그룹 없음 (최상위)</SelectItem>
                        {availableGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-blue-600" />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 선택된 부모 그룹 표시 (그룹에 추가할 때) */}
            {isAddingToGroup && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Folder className="h-4 w-4" />
                  <span className="font-medium">
                    {availableGroups.find(g => g.id === parentGroupId)?.name || '선택된 그룹'}에 추가
                  </span>
                </div>
              </div>
            )}

            {/* 용기 이름 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {containerType === 'group' ? '그룹' : '용기'} 이름 *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={`${containerType === 'group' ? '그룹' : '용기'} 이름을 입력하세요`} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 코드명 */}
            <FormField
              control={form.control}
              name="code_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코드명</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="코드명 (선택사항)" 
                        {...field} 
                        className={codeNameError ? 'border-red-500' : ''}
                      />
                      {codeNameChecking && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {codeNameError && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      {codeNameError}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 가격 */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>가격 (원)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="가격 (선택사항)" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 설명 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="용기에 대한 설명 (선택사항)" 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={loading || codeNameChecking || !!codeNameError}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 