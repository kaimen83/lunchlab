'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, ClipboardList, BookOpen } from 'lucide-react';
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
        
        // DB에서 받아온 기능 목록과 정의된 기능 목록을 합침
        const enrichedFeatures = data.map((feature: any) => ({
          ...feature,
          ...featureDefinitions[feature.feature_name]
        }));
        
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
      window.localStorage.setItem('feature-change', JSON.stringify({
        companyId,
        featureName, 
        isEnabled: newState,
        timestamp: new Date().getTime()
      }));
      window.dispatchEvent(new Event('storage'));

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
      {features.map((feature) => (
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