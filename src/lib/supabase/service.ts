import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * Only safe inside Server Actions / API routes (never exposed to browser).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
