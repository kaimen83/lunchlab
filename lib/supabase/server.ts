import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * 서버 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다.
 * 서비스 롤 키를 사용하여 모든 데이터에 접근할 수 있는 권한을 가집니다.
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}; 