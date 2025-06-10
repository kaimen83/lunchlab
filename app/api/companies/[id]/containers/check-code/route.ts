import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerCompany } from '@/actions/companies-actions';
import { getUserMembership } from '@/actions/membership-actions';
import { isFeatureEnabled } from '@/lib/feature-flags';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 용기 코드명 중복 확인 API
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id: companyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const excludeId = searchParams.get('excludeId'); // 수정 시 자기 자신 제외
    const containerType = searchParams.get('type') || 'item'; // 기본값은 item

    if (!code) {
      return Response.json({ error: '코드명을 입력해주세요.' }, { status: 400 });
    }

    // 회사 확인 및 권한 체크
    const company = await getServerCompany(companyId);
    if (!company) {
      return Response.json({ error: '회사를 찾을 수 없습니다.' }, { status: 404 });
    }

    const membership = await getUserMembership({ userId, companyId });
    if (!membership) {
      return Response.json({ error: '회사 멤버가 아닙니다.' }, { status: 403 });
    }

    // 메뉴 기능이 활성화되어 있는지 확인 (용기는 메뉴 기능의 일부)
    const hasMenusFeature = await isFeatureEnabled('menus', companyId);
    if (!hasMenusFeature) {
      return Response.json({ error: '메뉴 기능이 비활성화되어 있습니다.' }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();

    // 1. 동일한 타입에서 코드명 중복 체크
    let containersQuery = supabase
      .from('containers')
      .select('id, name, container_type')
      .eq('company_id', companyId)
      .eq('code_name', code)
      .eq('container_type', containerType);

    // 수정 모드인 경우 자기 자신 제외
    if (excludeId) {
      containersQuery = containersQuery.neq('id', excludeId);
    }

    const { data: existingContainers, error: containersError } = await containersQuery;

    if (containersError) {
      console.error('용기 코드명 조회 오류:', containersError);
      return Response.json({ error: '코드명 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 2. 식재료에서도 코드명 중복 체크 (전체 시스템에서 유니크해야 함)
    let ingredientsQuery = supabase
      .from('ingredients')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('code_name', code);

    const { data: existingIngredients, error: ingredientsError } = await ingredientsQuery;

    if (ingredientsError) {
      console.error('식재료 코드명 조회 오류:', ingredientsError);
      return Response.json({ error: '코드명 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 3. 다른 타입의 용기에서도 코드명 중복 체크
    const otherContainerType = containerType === 'group' ? 'item' : 'group';
    let otherTypeContainersQuery = supabase
      .from('containers')
      .select('id, name, container_type')
      .eq('company_id', companyId)
      .eq('code_name', code)
      .eq('container_type', otherContainerType);

    const { data: otherTypeContainers, error: otherTypeError } = await otherTypeContainersQuery;

    if (otherTypeError) {
      console.error('다른 타입 용기 코드명 조회 오류:', otherTypeError);
      return Response.json({ error: '코드명 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 결과 분석
    const sameTypeExists = existingContainers && existingContainers.length > 0;
    const ingredientsExists = existingIngredients && existingIngredients.length > 0;
    const otherTypeExists = otherTypeContainers && otherTypeContainers.length > 0;
    
    const exists = sameTypeExists || ingredientsExists || otherTypeExists;

    // 상세한 중복 정보 반환
    let conflictInfo = null;
    if (exists) {
      if (sameTypeExists) {
        const conflictItem = existingContainers[0];
        conflictInfo = {
          type: containerType === 'group' ? '그룹' : '용기',
          name: conflictItem.name,
          category: 'container'
        };
      } else if (ingredientsExists) {
        const conflictItem = existingIngredients[0];
        conflictInfo = {
          type: '식재료',
          name: conflictItem.name,
          category: 'ingredient'
        };
      } else if (otherTypeExists) {
        const conflictItem = otherTypeContainers[0];
        conflictInfo = {
          type: conflictItem.container_type === 'group' ? '그룹' : '용기',
          name: conflictItem.name,
          category: 'container'
        };
      }
    }

    return Response.json({
      exists,
      conflictInfo,
      // 기존 호환성을 위한 필드들
      containersExists: sameTypeExists || otherTypeExists,
      ingredientsExists
    });

  } catch (error) {
    console.error('코드명 중복 체크 오류:', error);
    return Response.json(
      { error: '코드명 확인 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 