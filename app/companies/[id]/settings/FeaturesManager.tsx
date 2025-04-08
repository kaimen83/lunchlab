'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, ClipboardList, BookOpen, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Feature {
  name: string;
  display_name: string;
  description: string;
  icon: React.ReactNode;
  is_enabled: boolean;
}

export default function FeaturesManager({ companyId }: { companyId: string }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  // 기능 정의
  const featureDefinitions: Record<string, Omit<Feature, 'is_enabled'>> = {
    'settings': {
      name: 'settings',
      display_name: '기본 설정',
      description: '회사 기본 정보 관리',
      icon: <Settings className="w-5 h-5" />
    },
    'ingredients': {
      name: 'ingredients',
      display_name: '식재료 관리',
      description: '식재료 목록 관리 및 가격 추적',
      icon: <ClipboardList className="w-5 h-5" />
    },
    'menus': {
      name: 'menus',
      display_name: '메뉴 관리',
      description: '메뉴 등록 및 식재료 조합 관리',
      icon: <BookOpen className="w-5 h-5" />
    },
    'mealPlanning': {
      name: 'mealPlanning',
      display_name: '식단 관리',
      description: '식단 계획 및 일정 관리',
      icon: <CalendarDays className="w-5 h-5" />
    }
  };

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}/features`);
        if (!response.ok) {
          throw new Error('기능 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        console.log("API에서 받아온 기능 목록:", data);
        
        // 기본 기능 정의를 확인하여 누락된 기능을 식별
        const existingFeatureNames = data.map((feature: any) => feature.feature_name);
        const missingFeatures: any[] = [];
        
        // 필수 기능 목록
        const requiredFeatures = ['settings', 'ingredients', 'menus', 'mealPlanning'];
        
        // 누락된 기능 확인
        for (const featureName of requiredFeatures) {
          if (!existingFeatureNames.includes(featureName)) {
            console.log(`누락된 기능 발견: ${featureName}`);
            missingFeatures.push({
              feature_name: featureName,
              is_enabled: true,
              ...featureDefinitions[featureName]
            });
          }
        }
        
        // 누락된 기능이 있으면 API에 추가 요청
        if (missingFeatures.length > 0) {
          console.log("누락된 기능 추가 중:", missingFeatures);
          
          // 각 누락된 기능에 대해 활성화 요청
          for (const feature of missingFeatures) {
            try {
              await fetch(`/api/companies/${companyId}/features`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  featureName: feature.feature_name,
                  isEnabled: true
                })
              });
            } catch (error) {
              console.error(`${feature.feature_name} 기능 추가 실패:`, error);
            }
          }
        }
        
        // DB에서 받아온 기능 목록과 정의된 기능 목록을 합침
        const allFeatures = [...data, ...missingFeatures];
        const enrichedFeatures = allFeatures.map((feature: any) => ({
          ...feature,
          ...featureDefinitions[feature.feature_name]
        }));
        
        console.log("최종 처리된 기능 목록:", enrichedFeatures);
        setFeatures(enrichedFeatures);
      } catch (error) {
        console.error('기능 목록 로딩 오류:', error);
        toast({
          title: '오류 발생',
          description: '기능 목록을 불러오는데 실패했습니다.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [companyId]);

  const handleToggleFeature = async (featureName: string, newState: boolean) => {
    setUpdating(featureName);
    
    try {
      const response = await fetch(`/api/companies/${companyId}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          featureName: featureName,
          isEnabled: newState
        })
      });

      if (!response.ok) {
        throw new Error('기능 상태 변경에 실패했습니다.');
      }

      // 성공 시 상태 업데이트
      setFeatures(features.map(feature => 
        feature.name === featureName 
          ? { ...feature, is_enabled: newState } 
          : feature
      ));

      // 네비게이션 메뉴 업데이트를 위한 이벤트 발생
      const changeData = {
        companyId,
        featureName, 
        isEnabled: newState,
        timestamp: new Date().getTime()
      };
      window.localStorage.setItem('feature-change', JSON.stringify(changeData));
      
      // storage 이벤트는 다른 탭에서만 발생하므로, 현재 탭에서도 이벤트 발생
      window.dispatchEvent(new Event('storage'));
      
      // 커스텀 이벤트 발생
      window.dispatchEvent(new CustomEvent('feature-change', { 
        detail: changeData 
      }));

      toast({
        title: '설정 변경 완료',
        description: `${featureDefinitions[featureName].display_name} 기능이 ${newState ? '활성화' : '비활성화'}되었습니다.`,
      });
    } catch (error) {
      console.error('기능 상태 변경 오류:', error);
      toast({
        title: '오류 발생',
        description: '기능 상태를 변경하는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <FeatureSkeletonItem />
        <FeatureSkeletonItem />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {features.filter(feature => feature.name === 'settings').map((feature) => (
        <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-md text-blue-700">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-medium">{feature.display_name}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          </div>
          
          <Switch 
            checked={feature.is_enabled}
            disabled={updating === feature.name || feature.name === 'settings'} // settings는 항상 활성화
            onCheckedChange={(checked) => handleToggleFeature(feature.name, checked)}
          />
        </div>
      ))}

      {/* 식자재/메뉴 관리 통합 */}
      {(() => {
        const ingredientsFeature = features.find(f => f.name === 'ingredients');
        const menusFeature = features.find(f => f.name === 'menus');
        
        // 두 기능 중 하나라도 없으면 렌더링하지 않음
        if (!ingredientsFeature || !menusFeature) return null;
        
        // 통합된 기능의 활성화 상태 확인 (두 기능이 모두 활성화되어 있거나 모두 비활성화되어 있어야 함)
        const isEnabled = ingredientsFeature.is_enabled && menusFeature.is_enabled;
        const isDisabled = updating === 'ingredients' || updating === 'menus';
        
        return (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-md text-blue-700">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium">식자재/메뉴 관리</h3>
                <p className="text-sm text-gray-500">식재료 및 메뉴 관리 통합 기능</p>
              </div>
            </div>
            
            <Switch 
              checked={isEnabled}
              disabled={isDisabled}
              onCheckedChange={(checked) => {
                // 두 기능을 동시에 활성화/비활성화
                handleToggleFeature('ingredients', checked);
                handleToggleFeature('menus', checked);
              }}
            />
          </div>
        );
      })()}
      
      {/* 식단 관리 기능 */}
      {(() => {
        const mealPlanningFeature = features.find(f => f.name === 'mealPlanning');
        
        // 기능이 없으면 렌더링하지 않음
        if (!mealPlanningFeature) return null;
        
        return (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-md text-blue-700">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium">식단 관리</h3>
                <p className="text-sm text-gray-500">식단 계획 및 일정 관리</p>
              </div>
            </div>
            
            <Switch 
              checked={mealPlanningFeature.is_enabled}
              disabled={updating === 'mealPlanning'}
              onCheckedChange={(checked) => handleToggleFeature('mealPlanning', checked)}
            />
          </div>
        );
      })()}
    </div>
  );
}

// 로딩 상태 표시를 위한 컴포넌트
function FeatureSkeletonItem() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="bg-gray-100 p-2 rounded-md w-9 h-9"></div>
        <div>
          <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-60 bg-gray-100 rounded"></div>
        </div>
      </div>
      <div className="h-6 w-12 bg-gray-200 rounded"></div>
    </div>
  );
} 