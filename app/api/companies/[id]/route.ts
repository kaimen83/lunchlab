import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// 회사 세부 정보 조회
export async function GET(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: companyId } = await context.params;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 사용자가 해당 회사의 멤버인지 확인
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_memberships')
      .select('id, role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('멤버십 조회 오류:', membershipError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    if (!membershipData) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사 정보 조회
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (companyError) {
      console.error('회사 정보 조회 오류:', companyError);
      return NextResponse.json({ error: '회사 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 회사의 기능 목록 조회
    const { data: features, error: featuresError } = await supabase
      .from('company_features')
      .select('feature_name, is_enabled, config')
      .eq('company_id', companyId);
    
    if (featuresError) {
      console.error('회사 기능 조회 오류:', featuresError);
      // 기능 조회 오류는 치명적이지 않으므로, 빈 배열로 처리
    }
    
    // 응답 데이터 구성
    const responseData = {
      ...company,
      features: features || [],
      role: membershipData.role
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('회사 정보 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 요청자가 회사 소유자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 소유자만 회사 삭제 가능
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: '회사 삭제 권한이 없습니다. 소유자만 회사를 삭제할 수 있습니다.' }, { status: 403 });
    }
    
    // 트랜잭션으로 회사 관련 데이터 삭제 (의존성 순서대로)
    try {
      // 1. 템플릿 선택 관련 항목부터 조회하여 삭제
      const { data: templates } = await supabase
        .from('meal_templates')
        .select('id')
        .eq('company_id', companyId);
      
      if (templates && templates.length > 0) {
        const templateIds = templates.map(t => t.id);
        
        // 템플릿 선택 삭제
        await supabase
          .from('template_selections')
          .delete()
          .in('template_id', templateIds);
      }
      
      // 2. 식수 정보 삭제
      await supabase
        .from('meal_portions')
        .delete()
        .eq('company_id', companyId);
      
      // 3. 식단 메뉴 관련 항목 조회하여 삭제
      const { data: mealPlans } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('company_id', companyId);
      
      if (mealPlans && mealPlans.length > 0) {
        const mealPlanIds = mealPlans.map(p => p.id);
        
        // 식단 메뉴 삭제
        await supabase
          .from('meal_plan_menus')
          .delete()
          .in('meal_plan_id', mealPlanIds);
      }
      
      // 4. 식단 삭제
      await supabase
        .from('meal_plans')
        .delete()
        .eq('company_id', companyId);
      
      // 5. 식사 템플릿 삭제
      await supabase
        .from('meal_templates')
        .delete()
        .eq('company_id', companyId);
      
      // 6. 메뉴 관련 항목 조회
      const { data: menus } = await supabase
        .from('menus')
        .select('id')
        .eq('company_id', companyId);
      
      if (menus && menus.length > 0) {
        const menuIds = menus.map(m => m.id);
        
        // 메뉴 컨테이너 조회
        const { data: menuContainers } = await supabase
          .from('menu_containers')
          .select('id')
          .in('menu_id', menuIds);
        
        if (menuContainers && menuContainers.length > 0) {
          const containerIds = menuContainers.map(c => c.id);
          
          // 메뉴 컨테이너 재료 삭제
          await supabase
            .from('menu_container_ingredients')
            .delete()
            .in('menu_container_id', containerIds);
        }
        
        // 메뉴 컨테이너 삭제
        await supabase
          .from('menu_containers')
          .delete()
          .in('menu_id', menuIds);
        
        // 메뉴 가격 기록 삭제
        await supabase
          .from('menu_price_history')
          .delete()
          .in('menu_id', menuIds);
        
        // 메뉴 재료 삭제
        await supabase
          .from('menu_ingredients')
          .delete()
          .in('menu_id', menuIds);
      }
      
      // 7. 메뉴 삭제
      await supabase
        .from('menus')
        .delete()
        .eq('company_id', companyId);
      
      // 8. 재료 관련 항목 조회
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id')
        .eq('company_id', companyId);
      
      if (ingredients && ingredients.length > 0) {
        const ingredientIds = ingredients.map(i => i.id);
        
        // 재료 가격 기록 삭제
        await supabase
          .from('ingredient_price_history')
          .delete()
          .in('ingredient_id', ingredientIds);
      }
      
      // 9. 재료 삭제
      await supabase
        .from('ingredients')
        .delete()
        .eq('company_id', companyId);
      
      // 10. 컨테이너 삭제
      await supabase
        .from('containers')
        .delete()
        .eq('company_id', companyId);
      
      // 11. 공급업체 삭제
      await supabase
        .from('suppliers')
        .delete()
        .eq('company_id', companyId);
      
      // 12. 회사 기능 삭제
      await supabase
        .from('company_features')
        .delete()
        .eq('company_id', companyId);
      
      // 13. 회사 가입 요청 삭제
      await supabase
        .from('company_join_requests')
        .delete()
        .eq('company_id', companyId);
      
      // 14. 초대 삭제
      await supabase
        .from('company_invitations')
        .delete()
        .eq('company_id', companyId);
      
      // 15. 멤버십 삭제
      await supabase
        .from('company_memberships')
        .delete()
        .eq('company_id', companyId);
      
      // 16. 회사 삭제
      await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);
      
      // 성공적으로 삭제 완료
      return NextResponse.json({ success: true, message: '회사가 성공적으로 삭제되었습니다.' });
    } catch (deleteError) {
      console.error('회사 삭제 중 오류 발생:', deleteError);
      return NextResponse.json({ error: '회사 삭제 중 오류가 발생했습니다. 다시 시도해주세요.' }, { status: 500 });
    }
  } catch (error) {
    console.error('회사 삭제 요청 처리 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH 메서드 추가
export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 처리
    const { id: companyId } = await context.params;
    
    if (!companyId) {
      return NextResponse.json({ error: '회사 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 요청 본문 파싱
    const body = await req.json();
    const { name, description } = body;
    
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: '회사 이름은 최소 2자 이상이어야 합니다.' }, { status: 400 });
    }
    
    const supabase = createServerSupabaseClient();
    
    // 요청자가 회사의 소유자 또는 관리자인지 확인
    const { data: membership, error: membershipError } = await supabase
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .single();
    
    if (membershipError || !membership) {
      return NextResponse.json({ error: '해당 회사에 접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 소유자나 관리자만 회사 정보 수정 가능
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: '회사 정보 수정 권한이 없습니다.' }, { status: 403 });
    }
    
    // 회사 정보 업데이트
    const { data, error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single();
    
    if (updateError) {
      console.error('회사 정보 업데이트 오류:', updateError);
      return NextResponse.json({ error: '회사 정보 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('회사 정보 업데이트 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 