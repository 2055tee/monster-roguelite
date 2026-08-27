import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client factory. Uses the publishable (anon) key —
 * safe to expose to the client. Call this inside client components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars.'
    );
  }

  return createBrowserClient(url, publishableKey);
}
