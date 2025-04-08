'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ToggleLeft, ToggleRight, Package, UtensilsCrossed, CalendarDays } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Feature {
  id?: string;
  feature_name: string;
  is_enabled: boolean;
  config?: any;
}

interface CompanyFeaturesSectionProps {
  companyId: string;
  initialFeatures: Feature[];
}

export function CompanyFeaturesSection({ companyId, initialFeatures }: CompanyFeaturesSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [features, setFeatures] = useState<Feature[]>(initialFeatures || []);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  // 기능 목록 (추후 확장 가능)
  const availableFeatures = [
    {
      name: 'ingredients',
      label: '식재료 및 메뉴 관리',
      description: '식재료 및 메뉴를 관리할 수 있습니다. 식재료 원가 계산, 메뉴 원가 계산 등의 기능을 제공합니다.',
      icon: <UtensilsCrossed className="h-5 w-5 text-blue-500" />
    },
    {
      name: 'mealPlanning',
      label: '식단 관리',
      description: '날짜별 식단 계획을 관리할 수 있습니다. 식단표 작성, 식단 조회 등의 기능을 제공합니다.',
      icon: <CalendarDays className="h-5 w-5 text-blue-500" />
    }
  ];

  // 기능 상태 변경 처리
  const handleToggleFeature = async (featureName: string) => {
    // 현재 기능 상태 확인
    const featureIndex = features.findIndex(f => f.feature_name === featureName);
    const isEnabled = featureIndex >= 0 ? !features[featureIndex].is_enabled : true;
    
    setIsLoading(prev => ({ ...prev, [featureName]: true }));
    
    try {
      const response = await fetch(`/api/companies/${companyId}/features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureName,
          isEnabled
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '기능 설정 중 오류가 발생했습니다.');
      }
      
      const updatedFeature = await response.json();
      
      // 상태 업데이트
      setFeatures(prevFeatures => {
        if (featureIndex >= 0) {
          // 기존 기능 업데이트
          return prevFeatures.map(f => 
            f.feature_name === featureName ? updatedFeature : f
          );
        } else {
          // 새 기능 추가
          return [...prevFeatures, updatedFeature];
        }
      });
      
      toast({
        title: `${isEnabled ? '활성화' : '비활성화'} 완료`,
        description: `${availableFeatures.find(f => f.name === featureName)?.label} 기능이 ${isEnabled ? '활성화' : '비활성화'}되었습니다.`,
        variant: 'default',
      });
      
    } catch (error) {
      console.error('기능 토글 오류:', error);
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '기능 설정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [featureName]: false }));
    }
  };

  // 특정 기능의 현재 상태 확인
  const getFeatureStatus = (featureName: string) => {
    const feature = features.find(f => f.feature_name === featureName);
    return feature?.is_enabled || false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">기능 관리</h2>
      </div>

      <div className="grid gap-4">
        {availableFeatures.map((feature) => (
          <Card key={feature.name} className={`overflow-hidden transition-all ${getFeatureStatus(feature.name) ? 'border-blue-200 bg-blue-50/50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.label}</CardTitle>
                </div>
                <Switch
                  checked={getFeatureStatus(feature.name)}
                  onCheckedChange={() => handleToggleFeature(feature.name)}
                  disabled={isLoading[feature.name]}
                />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
            {getFeatureStatus(feature.name) && (
              <CardFooter className="border-t pt-3 bg-blue-50/80">
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    // 기능별 올바른 경로로 이동
                    let path: string;
                    
                    // 기능명에 따라 경로 명확하게 지정
                    if (feature.name === 'mealPlanning') {
                      path = `/companies/${companyId}/meal-plans`;
                      console.log(`식단 관리 경로로 이동: ${path}`);
                    } else if (feature.name === 'ingredients') {
                      path = `/companies/${companyId}/ingredients`;
                    } else if (feature.name === 'menus') {
                      path = `/companies/${companyId}/menus`;
                    } else {
                      path = `/companies/${companyId}/${feature.name}`;
                    }
                    
                    router.push(path);
                  }}
                >
                  관리하기
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 