import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * Only safe inside Server Actions / API routes (never exposed to browser).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  // Sanity check: service role key should be a JWT starting with eyJ
  if (!key.startsWith('eyJ')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY appears invalid (not a JWT). ' +
      'Please check your Vercel environment variables.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
