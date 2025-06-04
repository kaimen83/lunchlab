'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { MealPlan } from '../types';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Container, MenuContainer } from './types';
import MealPlanBasicInfo from './MealPlanBasicInfo';
import MealPlanMenuSelection from './MealPlanMenuSelection';
import { getContainerDetailsById, getFilteredMenusForContainer, getMenuDetailsById } from './menuHelpers';

interface MealPlanFormProps {
  companyId: string;
  initialData: MealPlan | null;
  defaultMealTime?: 'breakfast' | 'lunch' | 'dinner';
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MealPlanForm({ 
  companyId, 
  initialData, 
  defaultMealTime = 'lunch', 
  onSave, 
  onCancel 
}: MealPlanFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'dinner'>(defaultMealTime);
  const [containers, setContainers] = useState<Container[]>([]);
  const [menuContainers, setMenuContainers] = useState<MenuContainer[]>([]);
  const [containerSearchTerm, setContainerSearchTerm] = useState<string>('');
  const [menuSearchTerm, setMenuSearchTerm] = useState<string>('');
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [containerMenuSelections, setContainerMenuSelections] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [selectedContainerForMenu, setSelectedContainerForMenu] = useState<string | null>(null);
  const [isMenuSelectOpen, setIsMenuSelectOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [containerLoadingState, setContainerLoadingState] = useState<Record<string, boolean>>({});
  const [containerMenuCache, setContainerMenuCache] = useState<Record<string, MenuContainer[]>>({});
  const [isLoadingContainers, setIsLoadingContainers] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string } | null>(null);
  
  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDate(initialData.date ? new Date(initialData.date) : new Date());
      setMealTime(initialData.meal_time || defaultMealTime);
      
      if (initialData.meal_plan_menus?.length) {
        // 기존 식단에서 사용된 용기 목록 추출
        const selectedContainerIds: string[] = [];
        const containerMenuMap: Record<string, string[]> = {};
        
        initialData.meal_plan_menus.forEach(item => {
          if (item.container_id) {
            // 아직 추가되지 않은 용기면 배열과 ID 초기화
            if (!selectedContainerIds.includes(item.container_id)) {
              selectedContainerIds.push(item.container_id);
              containerMenuMap[item.container_id] = [];
            }
            
            // 메뉴 ID 추가
            if (item.menu_id) {
              containerMenuMap[item.container_id].push(item.menu_id);
            }
          }
        });
        
        setSelectedContainers(selectedContainerIds);
        setContainerMenuSelections(containerMenuMap);
        
        // 기존 데이터가 있는 용기들의 메뉴 정보를 미리 로드
        selectedContainerIds.forEach(containerId => {
          loadMenusForContainer(containerId);
        });
      }
    } else {
      // 초기 데이터가 없는 경우 (생성 모드)
      setMealTime(defaultMealTime); // 기본 식사 시간 설정
    }
    
    // 용기 목록 로드
    loadContainers();
  }, [initialData, defaultMealTime, companyId]);

  // 용기 목록 로드
  const loadContainers = async () => {
    setIsLoadingContainers(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/containers`);
      
      if (!response.ok) {
        throw new Error('용기 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setContainers(data);
    } catch (error) {
      console.error('용기 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '용기 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingContainers(false);
    }
  };
  
  // 특정 용기의 메뉴만 로드하는 새로운 함수
  const loadMenusForContainer = async (containerId: string) => {
    // 이미 로딩 중이거나 캐시에 있으면 스킵
    if (containerLoadingState[containerId] || containerMenuCache[containerId]) {
      return;
    }
    
    setContainerLoadingState(prev => ({ ...prev, [containerId]: true }));
    
    try {
      // 특정 용기의 메뉴만 요청
      const response = await fetch(`/api/companies/${companyId}/menu-containers?containerId=${containerId}`);
      
      if (!response.ok) {
        throw new Error('메뉴 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 용기별 캐시에 저장
      setContainerMenuCache(prev => ({
        ...prev,
        [containerId]: data
      }));
      
      // 전체 menuContainers 상태도 업데이트 (기존 로직과의 호환성을 위해)
      setMenuContainers(prev => {
        // 중복 제거하면서 새 데이터 추가
        const existingIds = new Set(prev.map(item => item.id));
        const newItems = data.filter((item: MenuContainer) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
    } catch (error) {
      console.error('메뉴 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '메뉴 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setContainerLoadingState(prev => ({ ...prev, [containerId]: false }));
    }
  };
  
  // 템플릿 선택 핸들러
  const handleTemplateSelect = async (templateId: string) => {
    try {
      // 템플릿 정보를 서버에서 가져오기
      const response = await fetch(`/api/companies/${companyId}/meal-templates/${templateId}`);
      
      if (!response.ok) {
        throw new Error('템플릿 정보를 불러오는데 실패했습니다.');
      }
      
      const templateData = await response.json();
      console.log("템플릿 데이터 로드 성공:", templateData);
      
      // 템플릿 객체 저장 (ID와 이름)
      setSelectedTemplate({
        id: templateId,
        name: templateData.name
      });
      
      // 템플릿 이름을 식단 이름으로 설정 (ID 대신 이름 사용)
      setName(templateData.name);
      
      // 템플릿에 메뉴 정보가 있다면 컨테이너만 선택하고 메뉴는 선택하지 않음
      if (templateData.template_selections?.length) {
        console.log("템플릿 선택 정보:", templateData.template_selections);
        
        const containerIds: string[] = [];
        // 메뉴 선택 정보를 초기화 (빈 객체로 설정)
        const menuSelections: Record<string, string[]> = {};
        
        templateData.template_selections.forEach((selection: any) => {
          if (selection.container_id) {
            containerIds.push(selection.container_id);
            // 템플릿에서 메뉴를 가져오지 않음 - 빈 상태로 둠
            // 주석 처리: menuSelections[selection.container_id] = selection.menu_id;
          }
        });
        
        console.log("선택할 용기 IDs:", containerIds);
        console.log("메뉴 선택 매핑:", menuSelections);
        
        // 선택된 용기가 있을 경우에만 설정 (빈 배열이면 설정하지 않음)
        if (containerIds.length > 0) {
          setSelectedContainers(containerIds);
          setContainerMenuSelections(menuSelections); // 빈 메뉴 선택 상태 설정
        }
      }
    } catch (error) {
      console.error('템플릿 정보 로드 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '템플릿 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  // 저장 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: '유효성 검사 오류',
        description: '식단 템플릿을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!date) {
      toast({
        title: '유효성 검사 오류',
        description: '날짜를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedContainers.length === 0) {
      toast({
        title: '유효성 검사 오류',
        description: '최소 1개 이상의 용기를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    
    /* 메뉴 선택 검사 주석 처리 - 메뉴가 선택되지 않은 용기 허용
    // 선택된 모든 용기에 메뉴가 할당되었는지 확인
    const unassignedContainers = selectedContainers.filter(
      containerId => !containerMenuSelections[containerId] || containerMenuSelections[containerId].length === 0
    );
    
    if (unassignedContainers.length > 0) {
      toast({
        title: '유효성 검사 오류',
        description: '모든 용기에 메뉴를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    */
    
    setIsLoading(true);
    
    try {
      // 메뉴 선택과 용기 선택을 API 요구 형식으로 변환
      const menu_selections: Array<{ menuId: string | null; containerId: string }> = [];
      
      selectedContainers.forEach(containerId => {
        const menuIds = containerMenuSelections[containerId] || [];
        
        // 각 메뉴 ID마다 별도의 항목 생성
        if (menuIds.length > 0) {
          menuIds.forEach(menuId => {
            menu_selections.push({
              menuId,
              containerId
            });
          });
        } else {
          // 메뉴가 하나도 선택되지 않은 경우
          menu_selections.push({
            menuId: null,
            containerId
          });
        }
      });
      
      const data = {
        name,
        template_id: selectedTemplate?.id || null,
        date: format(date, 'yyyy-MM-dd'),
        meal_time: mealTime,
        menu_selections
      };
      
      await onSave(data);
    } catch (error) {
      console.error('식단 저장 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '식단을 저장하는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 용기 선택 처리
  const toggleContainerSelection = (containerId: string) => {
    // 이미 선택되어 있는지 확인
    const isAlreadySelected = selectedContainers.includes(containerId);
    
    if (isAlreadySelected) {
      // 선택 해제: 먼저 선택된 용기 목록에서 제거
      setSelectedContainers(prev => prev.filter(id => id !== containerId));
      
      // 그 다음 메뉴 연결 정보도 제거 (별도의 상태 업데이트로 분리)
      setContainerMenuSelections(prev => {
        const updated = { ...prev };
        delete updated[containerId];
        return updated;
      });
    } else {
      // 선택 추가: 선택된 용기 목록에 추가
      setSelectedContainers(prev => [...prev, containerId]);
      // 해당 용기의 메뉴 배열 초기화
      setContainerMenuSelections(prev => ({
        ...prev,
        [containerId]: []
      }));
    }
  };

  // 용기에 메뉴 할당
  const handleMenuSelection = async (containerId: string, menuId: string, compatibleContainerId?: string) => {
    // 호환 용기 ID가 있는 경우, 해당 용기의 식재료 정보를 기존 용기에 적용
    if (compatibleContainerId) {
      try {
        setContainerLoadingState(prev => ({ ...prev, [containerId]: true })); // 로딩 상태 시작
        
        // 호환 용기의 메뉴 식재료 정보 가져오기
        const response = await fetch(`/api/companies/${companyId}/menu-containers?menuId=${menuId}&containerId=${compatibleContainerId}`);
        
        if (!response.ok) {
          throw new Error('호환 용기 정보를 가져오는데 실패했습니다.');
        }
        
        const compatibleMenuContainerData = await response.json();
        console.log('호환 용기 데이터:', compatibleMenuContainerData);
        
        // 호환 용기의 식재료 정보를 적용하는 API 호출
        const applyResponse = await fetch(`/api/companies/${companyId}/menu-containers/apply-compatible`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menuId,
            targetContainerId: containerId,
            sourceContainerId: compatibleContainerId,
          }),
        });
        
        // 상세 에러 정보 확인을 위해 응답 처리
        const responseText = await applyResponse.text();
        
        try {
          // JSON으로 파싱 시도
          const responseData = JSON.parse(responseText);
          
          if (!applyResponse.ok) {
            console.error('호환 용기 API 오류 응답:', responseData);
            throw new Error(responseData.error || '호환 용기 정보를 적용하는데 실패했습니다.');
          }
          
          console.log('호환 용기 적용 성공:', responseData);
        } catch (jsonError) {
          console.error('응답 파싱 오류:', jsonError);
          console.error('원본 응답 텍스트:', responseText);
          
          if (!applyResponse.ok) {
            throw new Error(`호환 용기 정보를 적용하는데 실패했습니다. 상태 코드: ${applyResponse.status}`);
          }
        }
        
        // 해당 용기의 메뉴 정보만 새로고침
        delete containerMenuCache[containerId]; // 캐시 삭제
        await loadMenusForContainer(containerId);
        
        // 성공 메시지 표시
        toast({
          title: '호환 용기 적용 완료',
          description: `선택한 용기의 정보가 성공적으로 적용되었습니다.`,
          variant: 'default'
        });
      } catch (error) {
        console.error('호환 용기 정보 적용 오류:', error);
        // 에러가 있을 때 알림
        toast({
          title: '호환 용기 적용 오류',
          description: error instanceof Error ? error.message : '호환 용기 정보를 적용하는데 실패했습니다.',
          variant: 'destructive'
        });
      } finally {
        setContainerLoadingState(prev => ({ ...prev, [containerId]: false })); // 로딩 상태 종료
      }
    }
    
    // 메뉴 선택 정보 업데이트 - 이미 선택된 메뉴인지 확인하고 토글
    setContainerMenuSelections(prev => {
      const updated = { ...prev };
      // 해당 용기에 대한 메뉴 배열이 없으면 초기화
      if (!updated[containerId]) {
        updated[containerId] = [];
      }
      
      // 이미 선택된 메뉴인지 확인
      const menuIndex = updated[containerId].indexOf(menuId);
      
      if (menuIndex === -1) {
        // 선택되지 않은 경우 추가
        updated[containerId] = [...updated[containerId], menuId];
      } else {
        // 이미 선택된 경우 제거 (토글)
        updated[containerId] = updated[containerId].filter(id => id !== menuId);
      }
      
      return updated;
    });
    
    // 선택 후 모달을 안전하게 닫기 위해 지연 처리
    setTimeout(() => {
      setIsMenuSelectOpen(false);
    }, 50);
  };
  
  // 용기 검색
  const filteredContainers = containers.filter(container => 
    container.name.toLowerCase().includes(containerSearchTerm.toLowerCase()) ||
    (container.description && container.description.toLowerCase().includes(containerSearchTerm.toLowerCase()))
  );
  
  // 컨테이너 이름으로 정렬
  const sortedSelectedContainers = [...selectedContainers].sort((a, b) => {
    const containerA = getContainerDetailsById(a, containers);
    const containerB = getContainerDetailsById(b, containers);
    
    return (containerA?.name || '').localeCompare(containerB?.name || '');
  });

  // 컴포넌트에서 사용할 속성들을 위한 함수 래퍼 생성
  const getContainerDetails = (containerId: string) => {
    return getContainerDetailsById(containerId, containers);
  };

  const getMenuDetails = (menuId: string) => {
    return getMenuDetailsById(menuId, menuContainers);
  };

  // 캐시된 메뉴를 우선 사용하도록 수정
  const getFilteredMenus = (containerId: string) => {
    const cachedMenus = containerMenuCache[containerId] || [];
    return getFilteredMenusForContainer(containerId, cachedMenus, menuSearchTerm);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="text-sm py-1.5">기본 정보</TabsTrigger>
          <TabsTrigger 
            value="menus" 
            disabled={selectedContainers.length === 0}
            className="relative text-sm py-1.5"
          >
            용기/메뉴 선택
            {selectedContainers.length > 0 && (
              <Badge className="ml-1.5 bg-primary text-white text-xs">{selectedContainers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="pt-4">
          <MealPlanBasicInfo 
            name={name}
            setName={setName}
            date={date}
            setDate={setDate}
            mealTime={mealTime}
            setMealTime={setMealTime}
            containerSearchTerm={containerSearchTerm}
            setContainerSearchTerm={setContainerSearchTerm}
            selectedContainers={selectedContainers}
            toggleContainerSelection={toggleContainerSelection}
            filteredContainers={filteredContainers}
            isLoading={isLoading}
            isLoadingContainers={isLoadingContainers}
            onCancel={onCancel}
            setActiveTab={setActiveTab}
            companyId={companyId}
            handleTemplateSelect={handleTemplateSelect}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
          />
        </TabsContent>
        
        <TabsContent value="menus" className="pt-4">
          <MealPlanMenuSelection 
            selectedContainers={selectedContainers}
            sortedSelectedContainers={sortedSelectedContainers}
            containerMenuSelections={containerMenuSelections}
            containerLoadingState={containerLoadingState}
            getContainerDetailsById={getContainerDetails}
            getMenuDetailsById={getMenuDetails}
            menuContainers={menuContainers}
            isLoading={isLoading}
            setActiveTab={setActiveTab}
            isMenuSelectOpen={isMenuSelectOpen}
            setIsMenuSelectOpen={setIsMenuSelectOpen}
            selectedContainerForMenu={selectedContainerForMenu}
            setSelectedContainerForMenu={setSelectedContainerForMenu}
            menuSearchTerm={menuSearchTerm}
            setMenuSearchTerm={setMenuSearchTerm}
            getFilteredMenusForContainer={getFilteredMenus}
            handleMenuSelection={handleMenuSelection}
            initialData={initialData}
            loadMenusForContainer={loadMenusForContainer}
          />
        </TabsContent>
      </Tabs>
    </form>
  );
} 