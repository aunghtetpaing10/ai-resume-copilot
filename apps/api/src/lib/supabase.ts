import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required');
}

// Base client for admin/general ops where RLS is not user-scoped
// Note: If you need to bypass RLS, you should use SUPABASE_SERVICE_ROLE_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a Supabase client authenticated as the specific user.
 * This is required to perform database queries that respect Row Level Security (RLS).
 */
export const createAuthClient = (token: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};
