import { createClient } from '@supabase/supabase-js';

/**
 * 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트를 생성합니다.
 * 공개 키를 사용하여 안전하게 데이터에 접근합니다.
 */
export const createClientSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  );
}; 