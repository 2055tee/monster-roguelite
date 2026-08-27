import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client factory. Bypasses Row Level Security —
 * only ever call this from trusted server-side code (server actions,
 * route handlers) that has already authorized the caller.
 *
 * Not used by WP0 itself; provided as a factory for WP3's server actions.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL env var.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY env var. Paste it in from the Supabase dashboard ' +
        '(Project Settings > API > service_role secret) into .env.local — never expose it to the client.'
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
