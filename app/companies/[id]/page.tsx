import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CompanyMembership } from '@/lib/types';
import { CompanyMemberList } from './CompanyMemberList';
import { Building, Calendar, ChevronDown, Info, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Next.js 15에서 페이지 컴포넌트 Props에 대한 타입 정의
interface CompanyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  // Next.js 15에서는 params가 Promise이므로 await로 처리
  const { id } = await params;
  const { userId } = await auth();
  
  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!userId) {
    redirect('/sign-in');
  }
  
  const supabase = createServerSupabaseClient();
  
  // 회사 정보 조회
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  
  if (companyError || !company) {
    notFound();
  }
  
  // 현재 사용자가 회사의 멤버인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', id)
    .eq('user_id', userId)
    .single();
  
  // 멤버가 아니라면 접근 불가 - headAdmin 예외 제거
  if (membershipError || !membership) {
    // 접근 권한이 없는 경우 홈으로 리다이렉트
    redirect('/');
  }
  
  // 회사 멤버 목록 조회
  const { data: members, error: membersError } = await supabase
    .from('company_memberships')
    .select('*')
    .eq('company_id', id);
  
  if (membersError) {
    console.error('회사 멤버 조회 오류:', membersError);
  }
  
  // 이번주 식단 가져오기
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  
  const { data: weeklyMealPlans, error: mealPlansError } = await supabase
    .from('meal_plans')
    .select(`
      *,
      meal_plan_menus(
        *,
        menu:menus(
          id,
          name,
          description
        )
      )
    `)
    .eq('company_id', id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  
  if (mealPlansError) {
    console.error('이번주 식단 조회 오류:', mealPlansError);
  }
  
  // 날짜별 및 식사 시간별 식단 분류
  const mealPlansByDate: Record<string, Record<string, any[]>> = {};
  
  daysOfWeek.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    mealPlansByDate[dateStr] = {
      breakfast: [],
      lunch: [],
      dinner: []
    };
  });
  
  weeklyMealPlans?.forEach(mealPlan => {
    if (mealPlansByDate[mealPlan.date]) {
      mealPlansByDate[mealPlan.date][mealPlan.meal_time].push(mealPlan);
    }
  });
  
  // 식사 시간 이름 변환 함수
  const getMealTimeName = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return '';
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 채널 헤더 - 반응형 디자인 적용 */}
      <header className="border-b border-gray-200 bg-white p-2 sm:p-3 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-gray-500 font-semibold text-lg sm:text-xl mr-2">#</span>
          <h1 className="text-lg sm:text-xl font-semibold">일반</h1>
        </div>
        
        <div className="flex items-center">
          <button className="text-gray-500 hover:text-gray-800 p-1 sm:p-1.5 rounded-sm hover:bg-gray-100 transition-colors duration-150 flex items-center mr-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            <span className="text-xs sm:text-sm font-medium">{members?.length || 0}</span>
          </button>
          
          <button className="text-gray-500 hover:text-gray-800 p-1 sm:p-1.5 rounded-sm hover:bg-gray-100 transition-colors duration-150">
            <Info className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </header>
      
      {/* 채널 콘텐츠 - 모바일 최적화 */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="w-full max-w-4xl mx-auto p-3 sm:p-4">
          {/* 회사 정보 아코디언 */}
          <div className="border-l-2 border-gray-200 pl-4 sm:pl-5 py-3 relative mt-4 sm:mt-6">
            <div className="absolute left-[-9px] sm:left-[-15px] top-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            
            <div className="mb-2">
              <span className="font-bold text-sm sm:text-base">회사 정보</span>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="company-info" className="border border-gray-200 rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <span className="font-semibold">{company.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-start">
                    <div className="bg-blue-100 p-2 sm:p-3 rounded-md mb-3 sm:mb-0 sm:mr-4 flex items-center justify-center sm:flex-shrink-0">
                      <Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-700" />
                    </div>
                    
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">{company.name}</h2>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">
                        {company.description || '회사 설명이 없습니다.'}
                      </p>
                      
                      {/* 회사 역할 배지 */}
                      <div className="mt-2 sm:mt-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          membership.role === 'owner' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : membership.role === 'admin' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {membership.role === 'owner' && '소유자'}
                          {membership.role === 'admin' && '관리자'}
                          {membership.role === 'member' && '멤버'}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* 멤버 목록 아코디언 */}
          <div className="border-l-2 border-gray-200 pl-4 sm:pl-5 py-3 relative mt-4 sm:mt-6">
            <div className="absolute left-[-9px] sm:left-[-15px] top-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </div>
            
            <div className="mb-2">
              <span className="font-bold text-sm sm:text-base">회사 멤버</span>
              <span className="text-xs text-gray-500 ml-2">멤버 {members?.length || 0}명</span>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="member-list" className="border border-gray-200 rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <span className="font-semibold">멤버 목록</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="px-4 py-3 overflow-x-auto">
                    <CompanyMemberList 
                      companyId={id}
                      members={members || []} 
                      currentUserMembership={membership as CompanyMembership}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* 이번주 식단 */}
          <div className="border-l-2 border-gray-200 pl-4 sm:pl-5 py-3 relative mt-4 sm:mt-6">
            <div className="absolute left-[-9px] sm:left-[-15px] top-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
            
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm sm:text-base">이번주 식단</span>
                <span className="text-xs text-gray-500 ml-2">
                  {format(weekStart, 'MM.dd', { locale: ko })} - {format(weekEnd, 'MM.dd', { locale: ko })}
                </span>
              </div>
              <a 
                href={`/companies/${id}/meal-plans`}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                전체보기
              </a>
            </div>
            
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-xs font-medium text-gray-500 text-left">
                        날짜
                      </th>
                      <th scope="col" className="px-2 py-2 text-xs font-medium text-gray-500 text-left">
                        아침
                      </th>
                      <th scope="col" className="px-2 py-2 text-xs font-medium text-gray-500 text-left">
                        점심
                      </th>
                      <th scope="col" className="px-2 py-2 text-xs font-medium text-gray-500 text-left">
                        저녁
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {daysOfWeek.map((day, index) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const mealPlans = mealPlansByDate[dateStr];
                      
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-xs text-gray-900 align-top">
                            <div className="font-semibold">{format(day, 'E', { locale: ko })}</div>
                            <div>{format(day, 'MM.dd')}</div>
                          </td>
                          
                          {['breakfast', 'lunch', 'dinner'].map((mealTime) => (
                            <td key={mealTime} className="px-2 py-2 text-xs text-gray-900 align-top">
                              {mealPlans[mealTime].length > 0 ? (
                                <div className="space-y-1">
                                  {mealPlans[mealTime].map((plan: any) => (
                                    <div key={plan.id} className="bg-gray-50 rounded p-1">
                                      <div className="font-medium">{plan.name}</div>
                                      <div className="text-gray-500 text-[0.65rem]">
                                        {plan.meal_plan_menus
                                          .map((item: any) => item.menu?.name)
                                          .filter(Boolean)
                                          .join(', ')}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-gray-400 italic">-</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 