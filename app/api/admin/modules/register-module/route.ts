import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ModuleConfig } from '@/lib/modules/module-template';
import { MarketplaceModule } from '@/lib/types';
import { registerIngredientsModule } from "@/lib/modules/ingredients/register";
import { ModuleMenuItem, ModulePermissionDefinition, ModuleDataSchemaDefinition, ModuleEventSubscriptionDefinition } from "@/lib/modules/module-template";

// 모듈 ID에 맞는 등록 함수 매핑
const moduleRegisterFunctions: Record<string, () => Promise<any>> = {
  "ingredients-module": registerIngredientsModule,
  // 추후 다른 모듈들을 여기에 추가
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    // 관리자 권한 확인 로직이 필요할 수 있음
    
    const requestData = await request.json();
    
    // moduleId만 있는 경우 - 기존 route.ts의 로직 실행
    if (requestData.moduleId && !requestData.id) {
      const { moduleId } = requestData;

      if (!moduleId) {
        return NextResponse.json(
          { error: "모듈 ID가 필요합니다." },
          { status: 400 }
        );
      }

      // 해당 모듈의 등록 함수 확인
      const registerFunction = moduleRegisterFunctions[moduleId];
      if (!registerFunction) {
        return NextResponse.json(
          { error: "지원되지 않는 모듈입니다." },
          { status: 404 }
        );
      }

      // 모듈 등록 실행
      const result = await registerFunction();

      if (!result.success) {
        return NextResponse.json(
          { error: "모듈 등록 실패", details: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "모듈이 성공적으로 등록되었습니다.", module: result.module },
        { status: 200 }
      );
    }
    
    // 모듈 구성 데이터가 직접 제공된 경우 - 새 route.ts의 로직 실행
    const supabase = createServerSupabaseClient();
    const { id, name, description, icon, category, version, price, requires_approval, menuItems, permissions, dataSchemas, eventTypes, eventSubscriptions } = requestData;
    
    // 필수 필드 체크
    if (!id || !name || !category || !version) {
      return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 });
    }

    // 1. 모듈 등록
    console.log('모듈 등록 중...', id);
    const { data: moduleData, error: moduleError } = await supabase
      .from('marketplace_modules')
      .insert({
        id,
        name,
        description,
        icon,
        category,
        version,
        price,
        requires_approval,
        created_by: userId
      })
      .select()
      .single();

    if (moduleError) {
      console.error('모듈 등록 실패:', moduleError);
      return NextResponse.json({ error: moduleError.message }, { status: 500 });
    }

    console.log('모듈이 성공적으로 등록되었습니다.', moduleData);
    
    // 2. 메뉴 아이템 등록 (있는 경우)
    if (menuItems && menuItems.length > 0) {
      console.log(`메뉴 아이템 등록 중... (${menuItems.length}개)`);
      const menuItemsToInsert = menuItems.map((item: ModuleMenuItem) => ({
        module_id: id,
        label: item.label,
        icon: item.icon,
        path: item.path,
        permission: item.permission,
        parent_id: item.parent_id,
        display_order: item.display_order
      }));
      
      const { error: menuError } = await supabase
        .from('module_menu_items')
        .insert(menuItemsToInsert);
      
      if (menuError) {
        console.error('메뉴 아이템 등록 실패:', menuError);
        return NextResponse.json({ error: menuError.message, phase: 'menu-items' }, { status: 500 });
      }
      
      console.log('메뉴 아이템이 성공적으로 등록되었습니다.');
    }
    
    // 3. 권한 등록 (있는 경우)
    if (permissions && permissions.length > 0) {
      console.log(`권한 등록 중... (${permissions.length}개)`);
      const permissionsToInsert = permissions.map((perm: ModulePermissionDefinition) => ({
        module_id: id,
        name: perm.name,
        description: perm.description,
        default_roles: perm.default_roles
      }));
      
      const { error: permError } = await supabase
        .from('module_permissions')
        .insert(permissionsToInsert);
      
      if (permError) {
        console.error('권한 등록 실패:', permError);
        return NextResponse.json({ error: permError.message, phase: 'permissions' }, { status: 500 });
      }
      
      console.log('권한이 성공적으로 등록되었습니다.');
    }
    
    // 4. 데이터 스키마 등록 (있는 경우)
    if (dataSchemas && dataSchemas.length > 0) {
      console.log(`데이터 스키마 등록 중... (${dataSchemas.length}개)`);
      const schemasToInsert = dataSchemas.map((schema: ModuleDataSchemaDefinition) => ({
        module_id: id,
        name: schema.name,
        description: schema.description,
        schema: schema.schema,
        is_shared: schema.is_shared,
        caching_strategy: schema.caching_strategy
      }));
      
      const { error: schemaError } = await supabase
        .from('module_data_schemas')
        .insert(schemasToInsert);
      
      if (schemaError) {
        console.error('데이터 스키마 등록 실패:', schemaError);
        return NextResponse.json({ error: schemaError.message, phase: 'data-schemas' }, { status: 500 });
      }
      
      console.log('데이터 스키마가 성공적으로 등록되었습니다.');
    }
    
    // 5. 이벤트 구독 템플릿 등록 (있는 경우)
    if (eventSubscriptions && eventSubscriptions.length > 0) {
      console.log(`이벤트 구독 템플릿 등록 중... (${eventSubscriptions.length}개)`);
      const subscriptionsToInsert = eventSubscriptions.map((sub: ModuleEventSubscriptionDefinition) => ({
        module_id: id,
        event_type: sub.event_type,
        source_module_id: sub.source_module_id
      }));
      
      const { error: subError } = await supabase
        .from('module_event_subscriptions_template')
        .insert(subscriptionsToInsert);
      
      if (subError) {
        console.error('이벤트 구독 템플릿 등록 실패:', subError);
        return NextResponse.json({ error: subError.message, phase: 'event-subscriptions' }, { status: 500 });
      }
      
      console.log('이벤트 구독 템플릿이 성공적으로 등록되었습니다.');
    }
    
    return NextResponse.json({
      message: '모듈이 성공적으로 등록되었습니다.',
      module: moduleData
    });
  } catch (error) {
    console.error("모듈 등록 처리 중 오류:", error);
    return NextResponse.json(
      { error: "모듈 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 