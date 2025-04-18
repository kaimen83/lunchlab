import { createClient as createClientBase } from '@supabase/supabase-js';

// 서버에서 사용할 Supabase 클라이언트 생성 함수
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL과 서비스 키가 필요합니다.');
  }
  
  return createClientBase(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}; 