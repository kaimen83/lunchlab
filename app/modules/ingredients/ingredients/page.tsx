import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ModuleLayout, ModuleCard } from '@/components/modules/ModuleLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DataTable } from './components/DataTable';
import { columns } from './components/Columns';
import { getCompany } from '@/lib/company';

export const metadata = {
  title: '식재료 관리 - 런치랩',
  description: '식재료 정보를 관리합니다.',
};

// 더미 데이터 생성
const generateDummyData = () => {
  return [
    {
      id: '1',
      name: '소고기',
      category_id: '1',
      category: '육류',
      unit: 'g',
      price_per_unit: 100,
      calories_per_unit: 2.5,
      allergens: [],
      storage_method: '냉장',
      created_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '2',
      name: '돼지고기',
      category_id: '1',
      category: '육류',
      unit: 'g',
      price_per_unit: 70,
      calories_per_unit: 2.1,
      allergens: [],
      storage_method: '냉장',
      created_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '3',
      name: '양파',
      category_id: '3',
      category: '채소',
      unit: '개',
      price_per_unit: 500,
      calories_per_unit: 40,
      allergens: [],
      storage_method: '실온',
      created_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '4',
      name: '당근',
      category_id: '3',
      category: '채소',
      unit: '개',
      price_per_unit: 300,
      calories_per_unit: 35,
      allergens: [],
      storage_method: '냉장',
      created_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '5',
      name: '우유',
      category_id: '6',
      category: '유제품',
      unit: 'ml',
      price_per_unit: 2.5,
      calories_per_unit: 0.65,
      allergens: ['우유'],
      storage_method: '냉장',
      created_at: '2023-12-01T00:00:00Z',
    },
    {
      id: '6',
      name: '달걀',
      category_id: '8',
      category: '기타',
      unit: '개',
      price_per_unit: 200,
      calories_per_unit: 70,
      allergens: ['계란'],
      storage_method: '냉장',
      created_at: '2023-12-01T00:00:00Z',
    },
  ];
};

export default async function IngredientsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  // 현재 활성화된 회사 정보 가져오기
  const company = await getCompany(userId);
  
  if (!company) {
    redirect('/companies');
  }
  
  // 실제 구현에서는 API를 통해 식재료 데이터를 가져와야 함
  // 테스트용으로 더미 데이터 사용
  const ingredients = generateDummyData();
  
  return (
    <ModuleLayout
      title="식재료 관리"
      description="식재료 정보를 등록하고 관리합니다."
      moduleId="ingredients-module"
      actions={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          식재료 추가
        </Button>
      }
    >
      <ModuleCard title="식재료 목록" description="등록된 모든 식재료 목록입니다.">
        <DataTable columns={columns} data={ingredients} />
      </ModuleCard>
    </ModuleLayout>
  );
}