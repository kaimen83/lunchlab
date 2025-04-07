import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { ModuleConfig } from '@/lib/modules/module-template';
import { MarketplaceModule } from '@/lib/types';

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
    
    const config: ModuleConfig = await request.json();
    
    if (!config.id || !config.name || !config.category || !config.version) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // 1. 모듈 등록
    const { data: moduleData, error: moduleError } = await supabase
      .from('marketplace_modules')
      .insert({
        id: config.id,
        name: config.name,
        description: config.description,
        icon: config.icon,
        category: config.category,
        price: config.price || 0,
        is_active: true,
        requires_approval: config.requires_approval,
        version: config.version,
      })
      .select()
      .single();
    
    if (moduleError) {
      console.error('모듈 등록 오류:', moduleError);
      return NextResponse.json(
        { error: '모듈 등록 중 오류가 발생했습니다.', details: moduleError.message },
        { status: 500 }
      );
    }
    
    // 2. 모듈 메뉴 아이템 등록
    if (config.menuItems && config.menuItems.length > 0) {
      const menuItems = config.menuItems.map((item, index) => ({
        module_id: config.id,
        label: item.label,
        icon: item.icon,
        path: item.path,
        parent_id: item.parent_id,
        permission: item.permission,
        display_order: item.display_order || index,
      }));
      
      const { error: menuError } = await supabase
        .from('module_menu_items')
        .insert(menuItems);
      
      if (menuError) {
        console.error('메뉴 아이템 등록 오류:', menuError);
        // 롤백은 하지 않고 계속 진행
      }
    }
    
    // 3. 모듈 권한 등록
    if (config.permissions && config.permissions.length > 0) {
      const permissions = config.permissions.map((perm) => ({
        module_id: config.id,
        name: perm.name,
        description: perm.description,
      }));
      
      const { error: permissionError } = await supabase
        .from('module_permissions')
        .insert(permissions);
      
      if (permissionError) {
        console.error('권한 등록 오류:', permissionError);
        // 롤백은 하지 않고 계속 진행
      }
      
      // 역할별 기본 권한 설정
      for (const perm of config.permissions) {
        if (perm.default_roles && perm.default_roles.length > 0) {
          const { data: permData } = await supabase
            .from('module_permissions')
            .select('id')
            .eq('module_id', config.id)
            .eq('name', perm.name)
            .single();
          
          if (permData) {
            const rolePermissions = perm.default_roles.map((role) => ({
              role,
              module_id: config.id,
              permission_id: permData.id,
            }));
            
            await supabase
              .from('role_module_permissions')
              .insert(rolePermissions);
          }
        }
      }
    }
    
    // 4. 데이터 스키마 등록
    if (config.dataSchemas && config.dataSchemas.length > 0) {
      const schemas = config.dataSchemas.map((schema) => ({
        module_id: config.id,
        name: schema.name,
        description: schema.description,
        schema: schema.schema,
        version: '1.0.0',
        is_shared: schema.is_shared,
      }));
      
      const { error: schemaError } = await supabase
        .from('module_data_schemas')
        .insert(schemas);
      
      if (schemaError) {
        console.error('데이터 스키마 등록 오류:', schemaError);
        // 롤백은 하지 않고 계속 진행
      }
      
      // 캐싱 정책 등록
      for (const schema of config.dataSchemas) {
        if (schema.caching_strategy) {
          const { data: schemaData } = await supabase
            .from('module_data_schemas')
            .select('id')
            .eq('module_id', config.id)
            .eq('name', schema.name)
            .single();
          
          if (schemaData) {
            await supabase
              .from('module_caching_policies')
              .insert({
                module_id: config.id,
                data_schema_id: schemaData.id,
                strategy: schema.caching_strategy.strategy,
                ttl_seconds: schema.caching_strategy.ttl_seconds,
                invalidate_on_events: schema.caching_strategy.invalidate_on_events,
              });
          }
        }
      }
    }
    
    // 5. 이벤트 구독 등록
    if (config.eventSubscriptions && config.eventSubscriptions.length > 0) {
      const subscriptions = config.eventSubscriptions.map((sub) => ({
        module_id: config.id,
        event_type: sub.event_type,
        source_module_id: sub.source_module_id,
        is_active: true,
      }));
      
      const { error: subError } = await supabase
        .from('module_event_subscriptions_template')
        .insert(subscriptions);
      
      if (subError) {
        console.error('이벤트 구독 등록 오류:', subError);
        // 롤백은 하지 않고 계속 진행
      }
    }
    
    const module: MarketplaceModule = moduleData;
    
    return NextResponse.json(module, { status: 201 });
  } catch (error) {
    console.error('모듈 등록 중 예외 발생:', error);
    return NextResponse.json(
      { error: '모듈 등록 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 